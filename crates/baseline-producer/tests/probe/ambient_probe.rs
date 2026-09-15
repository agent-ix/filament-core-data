// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Agent-IX

//! The NFR-036-M-7 ambient-read instrument (Plan-017 Task-150).
//!
//! A preloaded shared object that **records** every ambient read the process
//! makes, and asserts nothing. That is the whole point of it: NFR-036-M-7's
//! target and threshold are both zero reads, so the evidence has to be a
//! measured zero and not an unexercised assertion. The instrument writes one
//! line per intercepted call and the control in `tests/ambient_audit.rs` counts
//! the lines that fall inside the canonicalization region.
//!
//! It is not a cargo target. `tests/ambient_audit.rs` compiles it with `rustc`
//! into a scratch directory and preloads it over the test binary inside an
//! unprivileged network namespace. It is deliberately not a workspace member:
//! it needs `unsafe` to interpose a C symbol, and `agent-ix-baseline-producer`
//! forbids `unsafe_code` in every one of its targets.
//!
//! The intercepted set is exactly the five ambient categories NFR-036's
//! Statement excludes, with no exemption:
//!
//! * locale — `setlocale`, `newlocale`, `uselocale`
//! * environment — `getenv`, `secure_getenv`
//! * working directory — `getcwd`
//! * clock — `clock_gettime`, `time`, `gettimeofday`
//! * network — `socket`, `connect`, `getaddrinfo`
//!
//! Each interposer records the call and then forwards to the real symbol
//! resolved with `dlsym(RTLD_NEXT, …)`, so the instrumented process behaves
//! exactly as the uninstrumented one. Each line carries the calling thread's
//! kernel thread id, so a read the test harness makes on another thread is
//! distinguishable from one the canonicalization made.

#![allow(clippy::missing_safety_doc)]

use std::cell::Cell;
use std::ffi::{c_char, c_int, c_void};
use std::sync::atomic::{AtomicI32, AtomicPtr, Ordering};

/// `dlsym`'s pseudo-handle for "the next object after this one".
const RTLD_NEXT: *mut c_void = -1_isize as *mut c_void;

/// `O_WRONLY | O_CREAT | O_APPEND` on Linux.
const OPEN_FLAGS: c_int = 0o1 | 0o100 | 0o2000;
/// `0644`.
const OPEN_MODE: c_int = 0o644;

/// The environment member naming the log file. Read through the *real*
/// `getenv`, so reading it is not itself recorded.
const LOG_VARIABLE: &[u8] = b"AMBIENT_PROBE_LOG\0";

extern "C" {
    fn dlsym(handle: *mut c_void, symbol: *const c_char) -> *mut c_void;
    fn open(path: *const c_char, flags: c_int, ...) -> c_int;
    fn write(fd: c_int, buffer: *const c_void, count: usize) -> isize;
    fn gettid() -> c_int;
    fn abort() -> !;
}

/// `-2` unopened, `-1` unavailable, otherwise the log file descriptor.
static LOG: AtomicI32 = AtomicI32::new(-2);

thread_local! {
    /// Set while this thread is inside the instrument, so a recording that
    /// itself reads the environment does not record itself.
    static INSIDE: Cell<bool> = const { Cell::new(false) };
}

/// The real symbol behind `name`, or `abort` when the loader has none.
///
/// An absent symbol is a failure rather than a silent pass-through: an
/// instrument that quietly stopped forwarding would change the behaviour of the
/// run it is measuring.
unsafe fn real(name: &[u8], cache: &AtomicPtr<c_void>) -> *mut c_void {
    let cached = cache.load(Ordering::Relaxed);
    if !cached.is_null() {
        return cached;
    }
    let resolved = dlsym(RTLD_NEXT, name.as_ptr().cast());
    if resolved.is_null() {
        abort();
    }
    cache.store(resolved, Ordering::Relaxed);
    resolved
}

/// The log file descriptor, opened once, using the real `getenv`.
unsafe fn log_fd() -> c_int {
    let current = LOG.load(Ordering::Relaxed);
    if current != -2 {
        return current;
    }
    static GETENV: AtomicPtr<c_void> = AtomicPtr::new(std::ptr::null_mut());
    let getenv: unsafe extern "C" fn(*const c_char) -> *mut c_char =
        std::mem::transmute(real(b"getenv\0", &GETENV));
    let path = getenv(LOG_VARIABLE.as_ptr().cast());
    let fd = if path.is_null() {
        -1
    } else {
        open(path, OPEN_FLAGS, OPEN_MODE)
    };
    LOG.store(fd, Ordering::Relaxed);
    fd
}

/// Records one intercepted call: the calling thread's kernel id and the symbol.
fn record(symbol: &str) {
    let _ = INSIDE.try_with(|inside| {
        if inside.get() {
            return;
        }
        inside.set(true);
        // SAFETY: `log_fd`, `gettid` and `write` are the libc calls this
        // instrument exists to make, and the re-entry flag above is set, so
        // nothing here records itself.
        unsafe {
            let fd = log_fd();
            if fd >= 0 {
                let line = format!("{} {symbol}\n", gettid());
                write(fd, line.as_ptr().cast(), line.len());
            }
        }
        inside.set(false);
    });
}

/// Defines one interposer: record the call, then forward to the real symbol.
macro_rules! interpose {
    ($name:ident ( $( $argument:ident : $type:ty ),* ) -> $result:ty) => {
        /// Interposed: recorded, then forwarded to the real symbol.
        #[no_mangle]
        pub unsafe extern "C" fn $name($( $argument: $type ),*) -> $result {
            record(stringify!($name));
            static REAL: AtomicPtr<c_void> = AtomicPtr::new(std::ptr::null_mut());
            let forward: unsafe extern "C" fn($( $type ),*) -> $result =
                std::mem::transmute(real(concat!(stringify!($name), "\0").as_bytes(), &REAL));
            forward($( $argument ),*)
        }
    };
}

// Environment.
interpose!(getenv(name: *const c_char) -> *mut c_char);
interpose!(secure_getenv(name: *const c_char) -> *mut c_char);

// Locale.
interpose!(setlocale(category: c_int, locale: *const c_char) -> *mut c_char);
interpose!(newlocale(mask: c_int, locale: *const c_char, base: *mut c_void) -> *mut c_void);
interpose!(uselocale(locale: *mut c_void) -> *mut c_void);

// Working directory.
interpose!(getcwd(buffer: *mut c_char, size: usize) -> *mut c_char);

// Clock.
interpose!(clock_gettime(clock: c_int, value: *mut c_void) -> c_int);
interpose!(time(value: *mut c_void) -> i64);
interpose!(gettimeofday(value: *mut c_void, zone: *mut c_void) -> c_int);

// Network.
interpose!(socket(domain: c_int, kind: c_int, protocol: c_int) -> c_int);
interpose!(connect(socket: c_int, address: *const c_void, length: u32) -> c_int);
interpose!(getaddrinfo(
    node: *const c_char,
    service: *const c_char,
    hints: *const c_void,
    result: *mut *mut c_void
) -> c_int);
