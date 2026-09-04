//! A syntax check for an ECMA-262 regular expression.
//!
//! `semantic-ir.schema.json` fixes a `pattern` constraint's operands as
//! `{ regex, dialect: "ecma-262" }`, and
//! `conformance/diagnostic-codes.json` obliges
//! `agent-ix.semantic-ir.INVALID_PATTERN` for "a pattern operand that does not
//! compile under the declared dialect". This module decides *syntax* — the
//! property that decides whether a pattern compiles — without carrying a regex
//! engine, because this crate declares no dependency and a matcher is not what
//! the rule needs.

/// Whether `pattern` parses as an ECMA-262 `Pattern`.
pub fn compiles(pattern: &str) -> bool {
    let chars: Vec<char> = pattern.chars().collect();
    let mut parser = Parser { chars, pos: 0 };
    parser.disjunction() && parser.pos == parser.chars.len()
}

struct Parser {
    chars: Vec<char>,
    pos: usize,
}

impl Parser {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn disjunction(&mut self) -> bool {
        loop {
            if !self.alternative() {
                return false;
            }
            if self.peek() == Some('|') {
                self.pos += 1;
                continue;
            }
            return true;
        }
    }

    fn alternative(&mut self) -> bool {
        loop {
            match self.peek() {
                None | Some('|') | Some(')') => return true,
                _ => {}
            }
            if !self.term() {
                return false;
            }
        }
    }

    fn term(&mut self) -> bool {
        let quantifiable = match self.peek() {
            Some('^') | Some('$') => {
                self.pos += 1;
                false
            }
            Some('(') => {
                self.pos += 1;
                // A group specifier: `?:`, `?=`, `?!`, `?<=`, `?<!`, `?<name>`.
                if self.peek() == Some('?') {
                    self.pos += 1;
                    match self.peek() {
                        Some(':') | Some('=') | Some('!') => self.pos += 1,
                        Some('<') => {
                            self.pos += 1;
                            match self.peek() {
                                Some('=') | Some('!') => self.pos += 1,
                                _ => {
                                    // A named group: consume up to `>`.
                                    let mut named = false;
                                    while let Some(ch) = self.peek() {
                                        self.pos += 1;
                                        if ch == '>' {
                                            named = true;
                                            break;
                                        }
                                    }
                                    if !named {
                                        return false;
                                    }
                                }
                            }
                        }
                        _ => return false,
                    }
                }
                if !self.disjunction() {
                    return false;
                }
                if self.peek() != Some(')') {
                    return false;
                }
                self.pos += 1;
                true
            }
            Some(')') => return false,
            Some('[') => {
                self.pos += 1;
                if self.peek() == Some('^') {
                    self.pos += 1;
                }
                loop {
                    match self.peek() {
                        None => return false,
                        Some(']') => {
                            self.pos += 1;
                            break;
                        }
                        Some('\\') => {
                            self.pos += 1;
                            if self.peek().is_none() {
                                return false;
                            }
                            self.pos += 1;
                        }
                        Some(_) => self.pos += 1,
                    }
                }
                true
            }
            Some('\\') => {
                self.pos += 1;
                if self.peek().is_none() {
                    return false;
                }
                self.pos += 1;
                true
            }
            Some('*') | Some('+') | Some('?') => return false,
            Some(']') | Some('}') => {
                // ECMA-262's Annex B admits a bare `]` or `}` as a pattern
                // character; the strict grammar does not. Accept it, because a
                // conforming ECMAScript engine compiles it.
                self.pos += 1;
                true
            }
            Some('{') => {
                // Either a quantifier in an invalid position, or Annex B's
                // literal `{`. Accept as a literal.
                self.pos += 1;
                true
            }
            Some(_) => {
                self.pos += 1;
                true
            }
            None => return false,
        };
        if quantifiable {
            self.quantifier();
        } else if matches!(self.peek(), Some('*') | Some('+') | Some('?')) {
            // A quantifier cannot follow an assertion.
            return false;
        }
        true
    }

    fn quantifier(&mut self) {
        match self.peek() {
            Some('*') | Some('+') | Some('?') => self.pos += 1,
            Some('{') => {
                let start = self.pos;
                self.pos += 1;
                let mut digits = 0usize;
                while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
                    self.pos += 1;
                    digits += 1;
                }
                if digits == 0 {
                    self.pos = start;
                    return;
                }
                if self.peek() == Some(',') {
                    self.pos += 1;
                    while matches!(self.peek(), Some(c) if c.is_ascii_digit()) {
                        self.pos += 1;
                    }
                }
                if self.peek() == Some('}') {
                    self.pos += 1;
                } else {
                    self.pos = start;
                    return;
                }
            }
            _ => return,
        }
        if self.peek() == Some('?') {
            self.pos += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::compiles;

    #[test]
    fn tc_701_accepts_patterns_an_engine_compiles() {
        for pattern in [
            "^[a-z]+$",
            "a|b",
            "(?:ab)+",
            "\\d{2,4}",
            "[^]]",
            "a?",
            "(a(b(c)))",
            "^ix://[a-z0-9][a-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._~:/-]*$",
            "",
        ] {
            assert!(compiles(pattern), "{pattern:?} compiles");
        }
    }

    #[test]
    fn tc_701_rejects_patterns_an_engine_refuses() {
        for pattern in ["([a-z", "[a-z", "(a", "a)", "*a", "(?a)", "\\"] {
            assert!(!compiles(pattern), "{pattern:?} does not compile");
        }
    }
}
