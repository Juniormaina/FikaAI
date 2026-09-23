export function evaluateExpression(expression) {
  const source = String(expression || '').replace(/\s+/g, '');
  if (!source || source.length > 40 || !/^[\d+\-*/().]+$/.test(source) || !/[+\-*/]/.test(source)) {
    throw new Error('unsupported');
  }
  let index = 0;

  function parseExpr() {
    let left = parseTerm();
    while (source[index] === '+' || source[index] === '-') {
      const op = source[index];
      index += 1;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (source[index] === '*' || source[index] === '/') {
      const op = source[index];
      index += 1;
      const right = parseFactor();
      if (op === '/' && right === 0) throw new Error('division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parseFactor() {
    if (source[index] === '(') {
      index += 1;
      const value = parseExpr();
      if (source[index] !== ')') throw new Error('parenthesis');
      index += 1;
      return value;
    }
    const start = index;
    if (source[index] === '+' || source[index] === '-') index += 1;
    while (index < source.length && /[\d.]/.test(source[index])) index += 1;
    if (start === index || index - start === 1 && /[+-]/.test(source[start])) {
      throw new Error('number');
    }
    const value = Number(source.slice(start, index));
    if (!Number.isFinite(value)) throw new Error('number');
    return value;
  }

  const value = parseExpr();
  if (index !== source.length || !Number.isFinite(value)) throw new Error('trailing');
  return value;
}

export function formatResult(value) {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}
