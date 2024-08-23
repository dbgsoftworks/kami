#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function input(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

function compileKami(code) {
  // Replace Kami's print function with console.log
  code = code.replace(/print\((.*?)\)/g, 'console.log($1)');

  // Handle string interpolation for both single quotes and backticks
  code = code.replace(/(['`])(.*?)\{(.*?)\}(.*?)\1/g, '`$2${$3}$4`');

  // Convert let declarations to JavaScript let
  code = code.replace(/let\s+(\w+)\s*=\s*(.*)/g, 'let $1 = $2;');

  // Replace input() with await input()
  code = code.replace(/input\(\)/g, 'await input("")');

  // Add integer conversion function
  code = code.replace(/int\.(\w+)\(\)/g, 'parseInt($1, 10)');

  // Replace 'elif' with 'else if'
  code = code.replace(/\belif\b/g, 'else if');

  // Replace 'el' with 'else'
  code = code.replace(/\bel\b/g, 'else');

  // Replace 'sw' with 'switch'
  code = code.replace(/\bsw\b/g, 'switch');

  // Replace 'grab' with 'catch'
  code = code.replace(/\bgrab\b/g, 'catch');

  // Replace 'atm' with 'try'
  code = code.replace(/\batm\b/g, 'try');

  // Replace 'loop' with 'for'
  code = code.replace(/\bloop\b/g, 'for');

  // Replace 'back' with 'return'
  code = code.replace(/\bback\b/g, 'return');

  // Handle function definitions
  code = code.replace(/fn\s+(\w+)\s*\((.*?)\)\s*{([\s\S]*?)}/g, (match, funcName, args, body) => {
    const parsedArgs = args.split(',').map(arg => {
      const parts = arg.trim().split(/\s+/);
      return parts.length > 1 ? { type: parts[0], name: parts[1] } : { name: parts[0] };
    });
    
    const processedBody = body.replace(/(\w+)/g, (match, varName) => {
      const arg = parsedArgs.find(a => a.name === varName);
      if (arg && arg.type === 'int') {
        return `parseInt(${varName}, 10)`;
      }
      return varName;
    });

    const jsArgs = parsedArgs.map(arg => arg.name).join(', ');
    return `function ${funcName}(${jsArgs}) {${processedBody}}`;
  });

  // Handle function calls
  code = code.replace(/(\w+)\((.*?)\)/g, (match, funcName, args) => {
    if (funcName === 'print' || funcName === 'input' || funcName === 'int' || funcName === 'ocombine') {
      return match;
    }
    return `${funcName}(${args})`;
  });

  // Wrap the code in an async function to allow top-level await and include ocombine function
  return `
(async () => {
  function ocombine(op, a, b) {
    switch(op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) {
          throw new Error('Division by zero');
        }
        return a / b;
      default: throw new Error('Invalid operator');
    }
  }
  ${code}
})();
  `.trim();
}

async function runKami(code) {
  const compiledCode = compileKami(code);
  await eval(compiledCode);
}

if (process.argv.length > 2) {
  // File execution mode
  const fileName = process.argv[2];
  const code = fs.readFileSync(fileName, 'utf8');
  runKami(code).then(() => rl.close());
} else {
  // Interactive mode
  console.log("Kami Interactive Mode");
  console.log("Type 'exit' to quit");
  
  const promptUser = () => {
    rl.question('>>> ', async (line) => {
      if (line.trim().toLowerCase() === 'exit') {
        console.log('Exiting Kami');
        rl.close();
        return;
      }
      if (line.trim()) {
        await runKami(line);
      }
      promptUser();
    });
  };

  promptUser();
}

rl.on('close', () => {
  process.exit(0);
});
