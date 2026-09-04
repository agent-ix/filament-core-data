//! The ECMAScript `Number::toString` algorithm.
//!
//! The corpus comparison form `agent-ix-conformance-jcs-v1` is produced by
//! `JSON.stringify`, so every number this crate writes has to render exactly as
//! ECMAScript renders it. Rust's own `f64` `Display` never uses exponent
//! notation at all, so it disagrees with ECMAScript at both exponent thresholds
//! (`1e21` and `1e-7`) for every value beyond them.
//!
//! Derivation: ECMA-262 `Number::toString` (the `Number` to `String` algorithm),
//! reached from `conformance/README.md`'s canonical-form clause ("object keys
//! ordered by code point, no insignificant whitespace, array order preserved")
//! and `spec/functional/FR-036`'s clause that `normalized` is that form, which a
//! `JSON.stringify` implementation produces.
//!
//! The shortest round-tripping decimal digits are taken from Rust's own
//! `LowerExp`, which is documented to print the shortest representation that
//! round-trips. Only the *layout* of those digits is ECMAScript's.

/// Renders `value` exactly as ECMAScript's `String(value)` renders it.
///
/// `-0.0` renders as `0`, an integral value carries no `.0`, and the exponent
/// form is used at or above `1e21` and below `1e-6`, written with an explicit
/// `e+` or `e-`.
pub fn ecma_number_to_string(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value == 0.0 {
        // Covers -0.0: ECMAScript's String(-0) is "0".
        return "0".to_string();
    }
    if value < 0.0 {
        let mut out = String::from("-");
        out.push_str(&ecma_number_to_string(-value));
        return out;
    }
    if value.is_infinite() {
        return "Infinity".to_string();
    }

    // `{:e}` yields `d[.ddd]e<exp>` with the shortest round-tripping digits.
    let exp_form = format!("{value:e}");
    let (mantissa, exponent) = match exp_form.split_once('e') {
        Some(parts) => parts,
        // Unreachable for a finite f64, but a `?`-free fall-back beats a panic.
        None => return exp_form,
    };
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let exponent: i32 = match exponent.parse::<i32>() {
        Ok(value) => value,
        Err(_) => return exp_form,
    };

    let k = digits.len() as i32;
    // ECMA-262 fixes `s`, `k` and `n` by `value = s * 10^(n - k)`; `{:e}` gives
    // `value = s * 10^(exponent - (k - 1))`, so `n = exponent + 1`.
    let n = exponent + 1;

    layout(&digits, k, n)
}

fn layout(digits: &str, k: i32, n: i32) -> String {
    if k <= n && n <= 21 {
        let mut out = String::from(digits);
        for _ in 0..(n - k) {
            out.push('0');
        }
        return out;
    }
    if 0 < n && n <= 21 {
        let split = n as usize;
        let mut out = String::with_capacity(digits.len() + 1);
        out.push_str(&digits[..split]);
        out.push('.');
        out.push_str(&digits[split..]);
        return out;
    }
    if -6 < n && n <= 0 {
        let mut out = String::from("0.");
        for _ in 0..(-n) {
            out.push('0');
        }
        out.push_str(digits);
        return out;
    }
    let e = n - 1;
    let sign = if e >= 0 { '+' } else { '-' };
    let magnitude = if e >= 0 { e } else { -e };
    let mut out = String::new();
    if k == 1 {
        out.push_str(digits);
    } else {
        out.push_str(&digits[..1]);
        out.push('.');
        out.push_str(&digits[1..]);
    }
    out.push('e');
    out.push(sign);
    out.push_str(&magnitude.to_string());
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tc_700_renders_the_documented_shapes() {
        assert_eq!(ecma_number_to_string(0.0), "0");
        assert_eq!(ecma_number_to_string(-0.0), "0");
        assert_eq!(ecma_number_to_string(1.0), "1");
        assert_eq!(ecma_number_to_string(-1.0), "-1");
        assert_eq!(ecma_number_to_string(100.0), "100");
        assert_eq!(ecma_number_to_string(1.5), "1.5");
        assert_eq!(ecma_number_to_string(0.1), "0.1");
        assert_eq!(ecma_number_to_string(1e20), "100000000000000000000");
        assert_eq!(ecma_number_to_string(1e21), "1e+21");
        assert_eq!(ecma_number_to_string(1.5e21), "1.5e+21");
        assert_eq!(ecma_number_to_string(1e-6), "0.000001");
        assert_eq!(ecma_number_to_string(1e-7), "1e-7");
        assert_eq!(ecma_number_to_string(1.5e-7), "1.5e-7");
        assert_eq!(ecma_number_to_string(f64::MAX), "1.7976931348623157e+308");
        assert_eq!(
            ecma_number_to_string(f64::MIN_POSITIVE),
            "2.2250738585072014e-308"
        );
        assert_eq!(ecma_number_to_string(5e-324), "5e-324");
        assert_eq!(ecma_number_to_string(f64::INFINITY), "Infinity");
        assert_eq!(ecma_number_to_string(f64::NAN), "NaN");
    }
}

#[cfg(test)]
mod node_agreement {
    use super::ecma_number_to_string;
    use std::io::Write as _;
    use std::process::{Command, Stdio};

    /// The declared value set the formatter is measured on.
    ///
    /// It carries both exponent thresholds and the values either side of them,
    /// negative zero, trailing zeros, integral floats, the `f64` extremes, and
    /// a seeded pseudo-random spread of bit patterns, so the set is at least
    /// 512 values and is the same set on every run.
    fn declared_values() -> Vec<f64> {
        let mut values: Vec<f64> = vec![
            0.0,
            -0.0,
            1.0,
            -1.0,
            0.5,
            -0.5,
            100.0,
            1000.0,
            1.5,
            0.1,
            0.2,
            0.3,
            1.0 / 3.0,
            2.0_f64.powi(53),
            2.0_f64.powi(53) + 2.0,
            -(2.0_f64.powi(53)),
            9.007_199_254_740_991e15,
            f64::MAX,
            -f64::MAX,
            f64::MIN_POSITIVE,
            -f64::MIN_POSITIVE,
            5e-324,
            -5e-324,
            1e-323,
            1e21,
            -1e21,
            1e20,
            9.999_999_999_999_999e20,
            1.000_000_000_000_000_1e21,
            1e-6,
            1e-7,
            -1e-7,
            9.999_999e-7,
            1.000_000_1e-7,
            1e22,
            1e-22,
            1e300,
            1e-300,
            123_456_789.0,
            1_234_567_890_123_456_789.0,
            0.000_001_5,
            1e17,
            1e18,
            1e19,
        ];
        for exponent in -320i32..=308 {
            values.push(format!("1e{exponent}").parse::<f64>().unwrap_or(0.0));
            values.push(format!("-1.2345e{exponent}").parse::<f64>().unwrap_or(0.0));
        }
        // A seeded xorshift64* spread of bit patterns, finite values only.
        let mut state: u64 = 0x2026_0903_1234_5678;
        while values.len() < 1400 {
            state ^= state >> 12;
            state ^= state << 25;
            state ^= state >> 27;
            let bits = state.wrapping_mul(0x2545_F491_4F6C_DD1D);
            let candidate = f64::from_bits(bits);
            if candidate.is_finite() {
                values.push(candidate);
            }
        }
        values
    }

    #[test]
    fn tc_700_agrees_with_node_json_stringify_on_the_declared_values() {
        let values = declared_values();
        assert!(
            values.len() >= 512,
            "the declared set carries at least 512 values"
        );

        let mut stdin_payload = String::new();
        for value in &values {
            stdin_payload.push_str(&format!("{:016x}\n", value.to_bits()));
        }

        let script = r#"
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const out = [];
  for (const line of input.split("\n")) {
    if (line.length === 0) continue;
    const bits = BigInt("0x" + line);
    const buffer = new ArrayBuffer(8);
    new BigUint64Array(buffer)[0] = bits;
    const value = new Float64Array(buffer)[0];
    out.push(String(value) + "\t" + JSON.stringify(value));
  }
  process.stdout.write(out.join("\n"));
});
"#;

        let mut child = Command::new("node")
            .arg("-e")
            .arg(script)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("node is on PATH: without it this gate cannot run, and that is a failure");
        child
            .stdin
            .as_mut()
            .expect("the child's stdin is piped")
            .write_all(stdin_payload.as_bytes())
            .expect("the value set reaches node");
        let output = child.wait_with_output().expect("node runs to completion");
        assert!(output.status.success(), "node exited non-zero");
        let rendered = String::from_utf8(output.stdout).expect("node writes UTF-8");
        let lines: Vec<&str> = rendered.split('\n').collect();
        assert_eq!(
            lines.len(),
            values.len(),
            "one rendering per declared value"
        );

        let mut agreed = 0usize;
        for (value, line) in values.iter().zip(lines.iter()) {
            let (as_string, as_json) = line.split_once('\t').expect("both renderings");
            let mine = ecma_number_to_string(*value);
            assert_eq!(
                mine,
                as_string,
                "String({value:?}) disagrees at bits {:016x}",
                value.to_bits()
            );
            assert_eq!(
                mine,
                as_json,
                "JSON.stringify({value:?}) disagrees at bits {:016x}",
                value.to_bits()
            );
            agreed += 1;
        }
        assert_eq!(agreed, values.len());
        println!("number formatter agreed with node on {agreed} values");
    }
}
