//! A JSON reader and a canonical writer, carried by this crate rather than
//! taken from a dependency.
//!
//! The reader retains three things a `serde_json::Value` discards, each of
//! which this crate needs:
//!
//! * the source lexeme of every number, so that a document can be re-emitted
//!   without a formatter having already decided how it looks;
//! * object member order, so that a diagnostic can address the member the
//!   document actually carries;
//! * repeated member names, so that a duplicate is a fact of the input rather
//!   than something the reader silently resolved. Lookups resolve a duplicate
//!   the way `JSON.parse` does — the last occurrence wins.
//!
//! The writer emits the corpus comparison form `agent-ix-conformance-jcs-v1`,
//! which `conformance/README.md` defines as "object keys ordered by code point,
//! no insignificant whitespace, array order preserved".

use crate::number::ecma_number_to_string;
use core::fmt::Write as _;

/// The maximum nesting depth the reader accepts.
///
/// A reader that recurses without a bound turns a hostile document into a stack
/// overflow, which is an abort and not a diagnostic. `contracts-v1.md` requires
/// that "graph depth, reference expansion, collection sizes, input bytes, and
/// diagnostic volume must have declared finite limits and terminate with
/// source-located diagnostics".
pub const MAX_DEPTH: usize = 200;

/// The maximum number of input bytes the reader accepts.
pub const MAX_INPUT_BYTES: usize = 64 * 1024 * 1024;

/// A JSON value that retains number lexemes, member order, and duplicates.
#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number, kept as the lexeme the document carried.
    Number(String),
    /// A string, with every escape already resolved.
    Str(String),
    /// An array, in document order.
    Array(Vec<Json>),
    /// An object, in document order, duplicates retained.
    Object(Vec<(String, Json)>),
}

/// A positioned reader error.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JsonError {
    /// What went wrong.
    pub message: String,
    /// The byte offset the reader stopped at.
    pub offset: usize,
}

impl core::fmt::Display for JsonError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{} at byte {}", self.message, self.offset)
    }
}

impl Json {
    /// The member named `key`, resolving a duplicate the way `JSON.parse` does.
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Object(members) => members
                .iter()
                .rev()
                .find(|(name, _)| name == key)
                .map(|(_, value)| value),
            _ => None,
        }
    }

    /// The member at `index` of an array.
    pub fn at(&self, index: usize) -> Option<&Json> {
        match self {
            Json::Array(items) => items.get(index),
            _ => None,
        }
    }

    /// The string this value carries, if it is a string.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Json::Str(text) => Some(text),
            _ => None,
        }
    }

    /// The boolean this value carries, if it is a boolean.
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Json::Bool(value) => Some(*value),
            _ => None,
        }
    }

    /// The array this value carries, if it is an array.
    pub fn as_array(&self) -> Option<&[Json]> {
        match self {
            Json::Array(items) => Some(items),
            _ => None,
        }
    }

    /// The object members this value carries, if it is an object.
    pub fn as_object(&self) -> Option<&[(String, Json)]> {
        match self {
            Json::Object(members) => Some(members),
            _ => None,
        }
    }

    /// The number this value carries, parsed to an `f64`.
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Json::Number(lexeme) => lexeme.parse::<f64>().ok(),
            _ => None,
        }
    }

    /// The number this value carries when it is an exact integer.
    pub fn as_i64(&self) -> Option<i64> {
        let value = self.as_f64()?;
        if value.is_finite() && value.fract() == 0.0 && value.abs() < 9.007_199_254_740_992e15 {
            Some(value as i64)
        } else {
            None
        }
    }

    /// Whether this value is an object carrying `key`.
    pub fn has(&self, key: &str) -> bool {
        self.get(key).is_some()
    }
}

/// Reads one JSON document, rejecting trailing content.
pub fn parse(input: &str) -> Result<Json, JsonError> {
    if input.len() > MAX_INPUT_BYTES {
        return Err(JsonError {
            message: "the document is larger than the declared input limit".to_string(),
            offset: 0,
        });
    }
    let bytes = input.as_bytes();
    let mut reader = Reader {
        bytes,
        pos: 0,
        depth: 0,
    };
    reader.skip_whitespace();
    let value = reader.value()?;
    reader.skip_whitespace();
    if reader.pos != bytes.len() {
        return Err(JsonError {
            message: "trailing content after the document".to_string(),
            offset: reader.pos,
        });
    }
    Ok(value)
}

struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
    depth: usize,
}

impl<'a> Reader<'a> {
    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn err<T>(&self, message: &str) -> Result<T, JsonError> {
        Err(JsonError {
            message: message.to_string(),
            offset: self.pos,
        })
    }

    fn skip_whitespace(&mut self) {
        while let Some(byte) = self.peek() {
            match byte {
                b' ' | b'\t' | b'\n' | b'\r' => self.pos += 1,
                _ => break,
            }
        }
    }

    fn literal(&mut self, word: &str, value: Json) -> Result<Json, JsonError> {
        let end = self.pos + word.len();
        if self.bytes.len() >= end && &self.bytes[self.pos..end] == word.as_bytes() {
            self.pos = end;
            Ok(value)
        } else {
            self.err("an unrecognised literal")
        }
    }

    fn value(&mut self) -> Result<Json, JsonError> {
        if self.depth >= MAX_DEPTH {
            return self.err("the document nests deeper than the declared limit");
        }
        match self.peek() {
            None => self.err("an empty document"),
            Some(b'n') => self.literal("null", Json::Null),
            Some(b't') => self.literal("true", Json::Bool(true)),
            Some(b'f') => self.literal("false", Json::Bool(false)),
            Some(b'"') => {
                let text = self.string()?;
                Ok(Json::Str(text))
            }
            Some(b'[') => self.array(),
            Some(b'{') => self.object(),
            Some(byte) if byte == b'-' || byte.is_ascii_digit() => self.number(),
            Some(_) => self.err("a value the JSON grammar does not admit"),
        }
    }

    fn array(&mut self) -> Result<Json, JsonError> {
        self.pos += 1;
        self.depth += 1;
        let mut items = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(b']') {
            self.pos += 1;
            self.depth -= 1;
            return Ok(Json::Array(items));
        }
        loop {
            self.skip_whitespace();
            items.push(self.value()?);
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b']') => {
                    self.pos += 1;
                    self.depth -= 1;
                    return Ok(Json::Array(items));
                }
                _ => return self.err("an array member is followed by neither , nor ]"),
            }
        }
    }

    fn object(&mut self) -> Result<Json, JsonError> {
        self.pos += 1;
        self.depth += 1;
        let mut members: Vec<(String, Json)> = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(b'}') {
            self.pos += 1;
            self.depth -= 1;
            return Ok(Json::Object(members));
        }
        loop {
            self.skip_whitespace();
            if self.peek() != Some(b'"') {
                return self.err("an object member name is not a string");
            }
            let name = self.string()?;
            self.skip_whitespace();
            if self.peek() != Some(b':') {
                return self.err("an object member name is not followed by :");
            }
            self.pos += 1;
            self.skip_whitespace();
            let value = self.value()?;
            members.push((name, value));
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b'}') => {
                    self.pos += 1;
                    self.depth -= 1;
                    return Ok(Json::Object(members));
                }
                _ => return self.err("an object member is followed by neither , nor }"),
            }
        }
    }

    fn number(&mut self) -> Result<Json, JsonError> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        match self.peek() {
            Some(b'0') => self.pos += 1,
            Some(byte) if byte.is_ascii_digit() => {
                while matches!(self.peek(), Some(b) if b.is_ascii_digit()) {
                    self.pos += 1;
                }
            }
            _ => return self.err("a number carries no integer part"),
        }
        if self.peek() == Some(b'.') {
            self.pos += 1;
            if !matches!(self.peek(), Some(b) if b.is_ascii_digit()) {
                return self.err("a number carries a point with no fraction");
            }
            while matches!(self.peek(), Some(b) if b.is_ascii_digit()) {
                self.pos += 1;
            }
        }
        if matches!(self.peek(), Some(b'e') | Some(b'E')) {
            self.pos += 1;
            if matches!(self.peek(), Some(b'+') | Some(b'-')) {
                self.pos += 1;
            }
            if !matches!(self.peek(), Some(b) if b.is_ascii_digit()) {
                return self.err("a number carries an exponent with no digits");
            }
            while matches!(self.peek(), Some(b) if b.is_ascii_digit()) {
                self.pos += 1;
            }
        }
        match core::str::from_utf8(&self.bytes[start..self.pos]) {
            Ok(lexeme) => Ok(Json::Number(lexeme.to_string())),
            Err(_) => self.err("a number lexeme is not UTF-8"),
        }
    }

    fn string(&mut self) -> Result<String, JsonError> {
        self.pos += 1;
        let mut out = String::new();
        loop {
            let byte = match self.peek() {
                Some(byte) => byte,
                None => return self.err("a string is not closed"),
            };
            match byte {
                b'"' => {
                    self.pos += 1;
                    return Ok(out);
                }
                b'\\' => {
                    self.pos += 1;
                    let escape = match self.peek() {
                        Some(escape) => escape,
                        None => return self.err("a string ends inside an escape"),
                    };
                    self.pos += 1;
                    match escape {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let first = self.hex4()?;
                            if (0xD800..0xDC00).contains(&first) {
                                let saved = self.pos;
                                if self.peek() == Some(b'\\')
                                    && self.bytes.get(self.pos + 1) == Some(&b'u')
                                {
                                    self.pos += 2;
                                    let second = self.hex4()?;
                                    if (0xDC00..0xE000).contains(&second) {
                                        let combined = 0x1_0000
                                            + ((first - 0xD800) << 10)
                                            + (second - 0xDC00);
                                        match char::from_u32(combined) {
                                            Some(ch) => out.push(ch),
                                            None => out.push('\u{FFFD}'),
                                        }
                                        continue;
                                    }
                                    self.pos = saved;
                                }
                                // A lone surrogate cannot be held by a Rust
                                // `String`; it becomes the replacement
                                // character. No corpus string carries one.
                                out.push('\u{FFFD}');
                            } else if (0xDC00..0xE000).contains(&first) {
                                out.push('\u{FFFD}');
                            } else {
                                match char::from_u32(first) {
                                    Some(ch) => out.push(ch),
                                    None => out.push('\u{FFFD}'),
                                }
                            }
                        }
                        _ => return self.err("an escape the JSON grammar does not admit"),
                    }
                }
                0x00..=0x1F => return self.err("an unescaped control character in a string"),
                _ => {
                    let start = self.pos;
                    while let Some(byte) = self.peek() {
                        if byte == b'"' || byte == b'\\' || byte <= 0x1F {
                            break;
                        }
                        self.pos += 1;
                    }
                    match core::str::from_utf8(&self.bytes[start..self.pos]) {
                        Ok(chunk) => out.push_str(chunk),
                        Err(_) => return self.err("a string run is not UTF-8"),
                    }
                }
            }
        }
    }

    fn hex4(&mut self) -> Result<u32, JsonError> {
        let end = self.pos + 4;
        if end > self.bytes.len() {
            return self.err("a \\u escape carries fewer than four hex digits");
        }
        let mut value: u32 = 0;
        for index in self.pos..end {
            let byte = self.bytes[index];
            let digit = match byte {
                b'0'..=b'9' => u32::from(byte - b'0'),
                b'a'..=b'f' => u32::from(byte - b'a') + 10,
                b'A'..=b'F' => u32::from(byte - b'A') + 10,
                _ => return self.err("a \\u escape carries a non-hex digit"),
            };
            value = value * 16 + digit;
        }
        self.pos = end;
        Ok(value)
    }
}

/// Escapes `text` exactly as `JSON.stringify` escapes a string, quotes included.
pub fn write_string(out: &mut String, text: &str) {
    out.push('"');
    for ch in text.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            ch if (ch as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", ch as u32);
            }
            ch => out.push(ch),
        }
    }
    out.push('"');
}

/// Writes `value` in the corpus comparison form `agent-ix-conformance-jcs-v1`.
///
/// Object members are ordered by the code points of their names, array order is
/// preserved, no insignificant whitespace is written, a duplicate member is
/// resolved the way `JSON.parse` resolves it, and every number is rendered by
/// the ECMAScript `Number::toString` algorithm from its parsed `f64` — which is
/// what a `JSON.parse` followed by a `JSON.stringify` does to it.
pub fn to_canonical_string(value: &Json) -> String {
    let mut out = String::new();
    write_canonical(&mut out, value);
    out
}

fn write_canonical(out: &mut String, value: &Json) {
    match value {
        Json::Null => out.push_str("null"),
        Json::Bool(true) => out.push_str("true"),
        Json::Bool(false) => out.push_str("false"),
        Json::Number(lexeme) => match lexeme.parse::<f64>() {
            Ok(number) if number.is_finite() => out.push_str(&ecma_number_to_string(number)),
            // `JSON.stringify` writes a non-finite number as `null`.
            _ => out.push_str("null"),
        },
        Json::Str(text) => write_string(out, text),
        Json::Array(items) => {
            out.push('[');
            for (index, item) in items.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write_canonical(out, item);
            }
            out.push(']');
        }
        Json::Object(members) => {
            let mut resolved: Vec<(&str, &Json)> = Vec::with_capacity(members.len());
            for (name, member) in members {
                match resolved.iter_mut().find(|(seen, _)| *seen == name.as_str()) {
                    Some(slot) => slot.1 = member,
                    None => resolved.push((name.as_str(), member)),
                }
            }
            resolved.sort_by(|left, right| left.0.as_bytes().cmp(right.0.as_bytes()));
            out.push('{');
            for (index, (name, member)) in resolved.iter().enumerate() {
                if index > 0 {
                    out.push(',');
                }
                write_string(out, name);
                out.push(':');
                write_canonical(out, member);
            }
            out.push('}');
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tc_700_retains_lexemes_order_and_duplicates() {
        let value = parse(r#"{"b":1.50,"a":[2,3],"b":4}"#).expect("a well-formed document");
        let members = value.as_object().expect("an object");
        assert_eq!(members.len(), 3);
        assert_eq!(members[0].0, "b");
        assert_eq!(members[0].1, Json::Number("1.50".to_string()));
        assert_eq!(value.get("b"), Some(&Json::Number("4".to_string())));
    }

    #[test]
    fn tc_700_canonical_form_sorts_members_and_renders_numbers() {
        let value = parse(r#"{"b":1.50,"a":[2,3.0],"b":4}"#).expect("a well-formed document");
        assert_eq!(to_canonical_string(&value), r#"{"a":[2,3],"b":4}"#);
    }

    #[test]
    fn tc_700_escapes_as_json_stringify_does() {
        let mut out = String::new();
        write_string(&mut out, "a\"b\\c\nd\u{1}e\u{e9}");
        assert_eq!(out, "\"a\\\"b\\\\c\\nd\\u0001e\u{e9}\"");
    }

    #[test]
    fn tc_708_rejects_malformed_input_without_panicking() {
        for input in [
            "", "{", "[1,", "\"", "tru", "01", "1.", "1e", "{\"a\"}", "[1]]", "\u{1}",
        ] {
            assert!(parse(input).is_err(), "{input:?} is not a JSON document");
        }
    }

    #[test]
    fn tc_708_bounds_nesting_rather_than_overflowing_the_stack() {
        let deep = "[".repeat(5000);
        assert!(parse(&deep).is_err());
    }
}
