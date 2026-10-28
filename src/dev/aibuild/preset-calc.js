// 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식. 원작자 허락. 원본은 저장소 ref/botbuilder 브랜치.
import { assert } from './util.js';
  var precedence = { "+": 2, "-": 2, "*": 3, "/": 3, "^": 4, "%": 3, "<": 1, ">": 1, "|": 1, "&": 1, "≤": 1, "≥": 1, "=": 1, "≠": 1, "!": 5 };
  var isOperator = (char) => Object.hasOwn(precedence, char);
  var isNumber = (token) => Boolean(parseFloat(token)) || token === "0";
  function toRPN(expression) {
    expression = expression.replace(/\s+/g, "");
    const tokens = [], output = [], stack = [];
    let pending = "";
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      if (char === "-" && (i === 0 || isOperator(expression[i - 1]) || expression[i - 1] === "(")) pending += char;
      else if (isOperator(char)) {
        tokens.push(pending || "0", char);
        pending = "";
      } else pending += char;
    }
    tokens.push(pending || "0");
    for (const token of tokens) {
      if (isNumber(token)) output.push(token);
      else if (isOperator(token)) {
        while (stack.length && (token === "!" ? precedence[token] < precedence[stack.at(-1)] : precedence[token] <= precedence[stack.at(-1)])) output.push(stack.pop());
        stack.push(token);
      }
    }
    while (stack.length) output.push(stack.pop());
    return output;
  }
  function calculate(tokens) {
    const stack = [];
    for (const token of tokens) {
      if (isNumber(token)) {
        stack.push(parseFloat(token));
        continue;
      }
      const b = stack.pop(), a = stack.pop();
      switch (token) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          stack.push(a / b);
          break;
        case "^":
          stack.push(a ** b);
          break;
        case "%":
          stack.push(a % b);
          break;
        case "<":
          stack.push(a < b ? 1 : 0);
          break;
        case ">":
          stack.push(a > b ? 1 : 0);
          break;
        case "≤":
          stack.push(a <= b ? 1 : 0);
          break;
        case "≥":
          stack.push(a >= b ? 1 : 0);
          break;
        case "=":
          stack.push(a === b ? 1 : 0);
          break;
        case "≠":
          stack.push(a !== b ? 1 : 0);
          break;
        case "|":
          stack.push(a || b);
          break;
        case "&":
          stack.push(a && b);
          break;
        case "!":
          stack.push(b ? 0 : 1);
          break;
      }
    }
    return stack.length ? stack.pop() : 0;
  }
  function calculatePreset(source, { variables: variables2 = {}, globals = {} } = {}) {
    assert(source.length <= 65536, "CBS 계산식은 65,536자 이하만 지원합니다.");
    const read = (map, key2) => {
      const n = parseFloat(Object.hasOwn(map, key2) ? map[key2] : "");
      return Number.isNaN(n) ? "0" : String(n);
    };
    const execute = (text) => calculate(toRPN(text.replace(/\$([a-zA-Z0-9_]+)/g, (_, key2) => read(variables2, key2)).replace(/@([a-zA-Z0-9_]+)/g, (_, key2) => read(globals, key2)).replace(/&&/g, "&").replace(/\|\|/g, "|").replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/==/g, "=").replace(/!=/g, "≠").replace(/null/gi, "0")));
    const depth = [""];
    for (const char of source) {
      if (char === "(") {
        assert(depth.length < 50, "CBS 계산식 괄호 중첩이 너무 깊습니다.");
        depth.push("");
      } else if (char === ")" && depth.length > 1) {
        const value = execute(depth.pop());
        depth[depth.length - 1] += value;
      } else depth[depth.length - 1] += char;
    }
    return String(execute(depth.join("")));
  }

export { precedence, isOperator, isNumber, toRPN, calculate, calculatePreset };
