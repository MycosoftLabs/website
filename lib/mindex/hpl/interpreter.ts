/**
 * Hypha Programming Language (HPL) Interpreter
 * 
 * HPL is a novel, interdisciplinary programming language designed to
 * facilitate computational interaction with biological/fungal systems.
 * 
 * This module provides:
 * - HPL script parsing and execution
 * - Integration with MINDEX data queries
 * - Compilation to MycoBrain firmware instructions
 * - Environmental simulation commands
 * 
 * @see https://medium.com/@mycosoft.inc/introduction-to-the-hypha-programming-language-hpl-069567239474
 */

/**
 * HPL Token Types
 */
export enum HPLTokenType {
  // Keywords
  SPAWN = 'SPAWN',           // Create new mycelium thread
  BRANCH = 'BRANCH',         // Conditional branching
  MERGE = 'MERGE',           // Merge data streams
  SENSE = 'SENSE',           // Read sensor data
  EMIT = 'EMIT',             // Output/broadcast data
  DECAY = 'DECAY',           // Gradual value reduction
  GROW = 'GROW',             // Incremental expansion
  CONNECT = 'CONNECT',       // Establish network connection
  FRUIT = 'FRUIT',           // Trigger action/output
  SPORE = 'SPORE',           // Distribute/replicate
  
  // Data types
  HYPHA = 'HYPHA',           // Single data thread
  MYCELIUM = 'MYCELIUM',     // Network of connected data
  SUBSTRATE = 'SUBSTRATE',   // Environmental context
  ENZYME = 'ENZYME',         // Transformation function
  
  // Operators
  COLONIZE = 'COLONIZE',     // Assignment
  ANASTOMOSE = 'ANASTOMOSE', // Merge/combine
  DIGEST = 'DIGEST',         // Transform/process
  
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  
  // Symbols
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  DOT = 'DOT',
  ARROW = 'ARROW',
  
  // Identifiers
  IDENTIFIER = 'IDENTIFIER',
  
  // Special
  COMMENT = 'COMMENT',
  EOF = 'EOF',
}

/**
 * HPL Token
 */
export interface HPLToken {
  type: HPLTokenType;
  value: string | number | boolean;
  line: number;
  column: number;
}

/**
 * HPL AST Node types
 */
export type HPLASTNode = 
  | HPLSpawnNode
  | HPLBranchNode
  | HPLSenseNode
  | HPLEmitNode
  | HPLConnectNode
  | HPLFruitNode
  | HPLDecayNode
  | HPLGrowNode
  | HPLAssignmentNode
  | HPLEnzymeNode
  | HPLExpressionNode;

export interface HPLSpawnNode {
  type: 'spawn';
  name: string;
  body: HPLASTNode[];
}

export interface HPLBranchNode {
  type: 'branch';
  condition: HPLExpressionNode;
  trueBranch: HPLASTNode[];
  falseBranch?: HPLASTNode[];
}

export interface HPLSenseNode {
  type: 'sense';
  sensor: string;
  target?: string;
}

export interface HPLEmitNode {
  type: 'emit';
  channel: string;
  data: HPLExpressionNode;
}

export interface HPLConnectNode {
  type: 'connect';
  source: string;
  target: string;
  protocol?: string;
}

export interface HPLFruitNode {
  type: 'fruit';
  action: string;
  params: HPLExpressionNode[];
}

export interface HPLDecayNode {
  type: 'decay';
  variable: string;
  rate: number;
  floor?: number;
}

export interface HPLGrowNode {
  type: 'grow';
  variable: string;
  rate: number;
  ceiling?: number;
}

export interface HPLAssignmentNode {
  type: 'assignment';
  target: string;
  value: HPLExpressionNode;
}

export interface HPLEnzymeNode {
  type: 'enzyme';
  name: string;
  params: string[];
  body: HPLASTNode[];
}

export interface HPLExpressionNode {
  type: 'expression';
  operator?: string;
  left?: HPLExpressionNode | string | number | boolean;
  right?: HPLExpressionNode | string | number | boolean;
  value?: string | number | boolean;
  call?: {
    enzyme: string;
    args: HPLExpressionNode[];
  };
}

/**
 * HPL Execution Context
 */
export interface HPLContext {
  variables: Map<string, unknown>;
  enzymes: Map<string, HPLEnzymeNode>;
  sensors: Map<string, () => Promise<number>>;
  channels: Map<string, (data: unknown) => void>;
  spawn_threads: Map<string, HPLASTNode[]>;
}

/**
 * HPL Lexer - Tokenizes HPL source code
 */
export class HPLLexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  
  private keywords = new Map<string, HPLTokenType>([
    ['spawn', HPLTokenType.SPAWN],
    ['branch', HPLTokenType.BRANCH],
    ['merge', HPLTokenType.MERGE],
    ['sense', HPLTokenType.SENSE],
    ['emit', HPLTokenType.EMIT],
    ['decay', HPLTokenType.DECAY],
    ['grow', HPLTokenType.GROW],
    ['connect', HPLTokenType.CONNECT],
    ['fruit', HPLTokenType.FRUIT],
    ['spore', HPLTokenType.SPORE],
    ['hypha', HPLTokenType.HYPHA],
    ['mycelium', HPLTokenType.MYCELIUM],
    ['substrate', HPLTokenType.SUBSTRATE],
    ['enzyme', HPLTokenType.ENZYME],
    ['colonize', HPLTokenType.COLONIZE],
    ['anastomose', HPLTokenType.ANASTOMOSE],
    ['digest', HPLTokenType.DIGEST],
    ['true', HPLTokenType.BOOLEAN],
    ['false', HPLTokenType.BOOLEAN],
  ]);
  
  constructor(source: string) {
    this.source = source;
  }
  
  tokenize(): HPLToken[] {
    const tokens: HPLToken[] = [];
    
    while (this.position < this.source.length) {
      const char = this.source[this.position];
      
      // Skip whitespace
      if (/\s/.test(char)) {
        if (char === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.position++;
        continue;
      }
      
      // Comments (-- or #)
      if (char === '#' || (char === '-' && this.source[this.position + 1] === '-')) {
        while (this.position < this.source.length && this.source[this.position] !== '\n') {
          this.position++;
        }
        continue;
      }
      
      // Symbols
      if (char === '(') {
        tokens.push({ type: HPLTokenType.LPAREN, value: '(', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: HPLTokenType.RPAREN, value: ')', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === '{') {
        tokens.push({ type: HPLTokenType.LBRACE, value: '{', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === '}') {
        tokens.push({ type: HPLTokenType.RBRACE, value: '}', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === ',') {
        tokens.push({ type: HPLTokenType.COMMA, value: ',', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === '.') {
        tokens.push({ type: HPLTokenType.DOT, value: '.', line: this.line, column: this.column });
        this.position++;
        this.column++;
        continue;
      }
      if (char === '-' && this.source[this.position + 1] === '>') {
        tokens.push({ type: HPLTokenType.ARROW, value: '->', line: this.line, column: this.column });
        this.position += 2;
        this.column += 2;
        continue;
      }
      
      // String literals
      if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        this.position++;
        this.column++;
        while (this.position < this.source.length && this.source[this.position] !== quote) {
          value += this.source[this.position];
          this.position++;
          this.column++;
        }
        this.position++;
        this.column++;
        tokens.push({ type: HPLTokenType.STRING, value, line: this.line, column: this.column - value.length - 2 });
        continue;
      }
      
      // Number literals
      if (/\d/.test(char)) {
        let value = '';
        while (this.position < this.source.length && /[\d.]/.test(this.source[this.position])) {
          value += this.source[this.position];
          this.position++;
          this.column++;
        }
        tokens.push({ type: HPLTokenType.NUMBER, value: parseFloat(value), line: this.line, column: this.column - value.length });
        continue;
      }
      
      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        let value = '';
        while (this.position < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.position])) {
          value += this.source[this.position];
          this.position++;
          this.column++;
        }
        const type = this.keywords.get(value.toLowerCase()) || HPLTokenType.IDENTIFIER;
        const tokenValue = type === HPLTokenType.BOOLEAN ? value.toLowerCase() === 'true' : value;
        tokens.push({ type, value: tokenValue, line: this.line, column: this.column - value.length });
        continue;
      }
      
      // Unknown character, skip
      this.position++;
      this.column++;
    }
    
    tokens.push({ type: HPLTokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }
}

/**
 * HPL Interpreter - Executes HPL AST
 */
export class HPLInterpreter {
  private context: HPLContext;
  
  constructor() {
    this.context = {
      variables: new Map(),
      enzymes: new Map(),
      sensors: new Map(),
      channels: new Map(),
      spawn_threads: new Map(),
    };
    
    // Register built-in sensors for MINDEX integration
    this.registerBuiltinSensors();
  }
  
  private registerBuiltinSensors() {
    // Temperature sensor (simulated)
    this.context.sensors.set('temperature', async () => 20 + Math.random() * 10);
    
    // Humidity sensor (simulated)
    this.context.sensors.set('humidity', async () => 40 + Math.random() * 40);
    
    // CO2 sensor (simulated)
    this.context.sensors.set('co2', async () => 400 + Math.random() * 200);
    
    // Soil moisture sensor (simulated)
    this.context.sensors.set('moisture', async () => Math.random() * 100);
    
    // pH sensor (simulated)
    this.context.sensors.set('ph', async () => 5 + Math.random() * 3);
    
    // Light sensor (simulated)
    this.context.sensors.set('light', async () => Math.random() * 1000);
  }
  
  /**
   * Register a custom sensor
   */
  registerSensor(name: string, reader: () => Promise<number>) {
    this.context.sensors.set(name, reader);
  }
  
  /**
   * Register a channel for data output
   */
  registerChannel(name: string, handler: (data: unknown) => void) {
    this.context.channels.set(name, handler);
  }
  
  /**
   * Execute an HPL program
   */
  async execute(nodes: HPLASTNode[]): Promise<unknown> {
    let result: unknown;
    
    for (const node of nodes) {
      result = await this.executeNode(node);
    }
    
    return result;
  }
  
  private async executeNode(node: HPLASTNode): Promise<unknown> {
    switch (node.type) {
      case 'spawn':
        return this.executeSpawn(node);
      case 'branch':
        return this.executeBranch(node);
      case 'sense':
        return this.executeSense(node);
      case 'emit':
        return this.executeEmit(node);
      case 'assignment':
        return this.executeAssignment(node);
      case 'decay':
        return this.executeDecay(node);
      case 'grow':
        return this.executeGrow(node);
      case 'enzyme':
        return this.executeEnzyme(node);
      case 'fruit':
        return this.executeFruit(node);
      default:
        return null;
    }
  }
  
  private async executeSpawn(node: HPLSpawnNode): Promise<void> {
    this.context.spawn_threads.set(node.name, node.body);
    // In a real implementation, this would create an async thread
    console.log(`[HPL] Spawned thread: ${node.name}`);
  }
  
  private async executeBranch(node: HPLBranchNode): Promise<unknown> {
    const condition = await this.evaluateExpression(node.condition);
    if (condition) {
      return this.execute(node.trueBranch);
    } else if (node.falseBranch) {
      return this.execute(node.falseBranch);
    }
    return null;
  }
  
  private async executeSense(node: HPLSenseNode): Promise<number> {
    const sensor = this.context.sensors.get(node.sensor);
    if (!sensor) {
      throw new Error(`Unknown sensor: ${node.sensor}`);
    }
    const value = await sensor();
    if (node.target) {
      this.context.variables.set(node.target, value);
    }
    return value;
  }
  
  private async executeEmit(node: HPLEmitNode): Promise<void> {
    const channel = this.context.channels.get(node.channel);
    const data = await this.evaluateExpression(node.data);
    
    if (channel) {
      channel(data);
    } else {
      console.log(`[HPL] Emit to ${node.channel}:`, data);
    }
  }
  
  private async executeAssignment(node: HPLAssignmentNode): Promise<void> {
    const value = await this.evaluateExpression(node.value);
    this.context.variables.set(node.target, value);
  }
  
  private async executeDecay(node: HPLDecayNode): Promise<number> {
    const current = (this.context.variables.get(node.variable) as number) || 100;
    const decayed = Math.max(node.floor || 0, current * (1 - node.rate));
    this.context.variables.set(node.variable, decayed);
    return decayed;
  }
  
  private async executeGrow(node: HPLGrowNode): Promise<number> {
    const current = (this.context.variables.get(node.variable) as number) || 0;
    const grown = Math.min(node.ceiling || Infinity, current * (1 + node.rate));
    this.context.variables.set(node.variable, grown);
    return grown;
  }
  
  private async executeEnzyme(node: HPLEnzymeNode): Promise<void> {
    this.context.enzymes.set(node.name, node);
  }
  
  private async executeFruit(node: HPLFruitNode): Promise<unknown> {
    const params = await Promise.all(
      node.params.map(p => this.evaluateExpression(p))
    );
    
    console.log(`[HPL] Fruit action: ${node.action}`, params);
    
    // In production, this would trigger actual device actions
    return { action: node.action, params };
  }
  
  private async evaluateExpression(expr: HPLExpressionNode): Promise<unknown> {
    if (expr.value !== undefined) {
      // Literal value
      if (typeof expr.value === 'string' && this.context.variables.has(expr.value)) {
        return this.context.variables.get(expr.value);
      }
      return expr.value;
    }
    
    if (expr.call) {
      // Enzyme call
      const enzyme = this.context.enzymes.get(expr.call.enzyme);
      if (!enzyme) {
        throw new Error(`Unknown enzyme: ${expr.call.enzyme}`);
      }
      
      // Bind parameters
      const args = await Promise.all(
        expr.call.args.map(a => this.evaluateExpression(a))
      );
      enzyme.params.forEach((param, i) => {
        this.context.variables.set(param, args[i]);
      });
      
      return this.execute(enzyme.body);
    }
    
    if (expr.operator && expr.left !== undefined && expr.right !== undefined) {
      const left = await this.evaluateExpressionValue(expr.left);
      const right = await this.evaluateExpressionValue(expr.right);
      
      switch (expr.operator) {
        case '+': return (left as number) + (right as number);
        case '-': return (left as number) - (right as number);
        case '*': return (left as number) * (right as number);
        case '/': return (left as number) / (right as number);
        case '>': return (left as number) > (right as number);
        case '<': return (left as number) < (right as number);
        case '>=': return (left as number) >= (right as number);
        case '<=': return (left as number) <= (right as number);
        case '==': return left === right;
        case '!=': return left !== right;
        case '&&': return left && right;
        case '||': return left || right;
        default: return null;
      }
    }
    
    return null;
  }
  
  private async evaluateExpressionValue(
    value: HPLExpressionNode | string | number | boolean
  ): Promise<unknown> {
    if (typeof value === 'object' && 'type' in value) {
      return this.evaluateExpression(value);
    }
    if (typeof value === 'string' && this.context.variables.has(value)) {
      return this.context.variables.get(value);
    }
    return value;
  }
  
  /**
   * Get current variable values
   */
  getVariables(): Record<string, unknown> {
    return Object.fromEntries(this.context.variables);
  }
}

/**
 * Compile HPL to MycoBrain firmware instructions
 */
export function compileToFirmware(nodes: HPLASTNode[]): string[] {
  const instructions: string[] = [];
  
  for (const node of nodes) {
    switch (node.type) {
      case 'sense':
        instructions.push(`SENS ${node.sensor} ${node.target || 'R0'}`);
        break;
      case 'emit':
        instructions.push(`EMIT ${node.channel}`);
        break;
      case 'decay':
        instructions.push(`MULT ${node.variable} ${1 - node.rate}`);
        break;
      case 'grow':
        instructions.push(`MULT ${node.variable} ${1 + node.rate}`);
        break;
      case 'branch':
        instructions.push(`CMP ${JSON.stringify(node.condition)}`);
        instructions.push(`JNZ L${instructions.length + 2}`);
        break;
      case 'fruit':
        instructions.push(`EXEC ${node.action}`);
        break;
    }
  }
  
  return instructions;
}

/**
 * Example HPL script for reference
 */
export const HPL_EXAMPLE = `
# HPL Example: Mushroom Growing Chamber Control
# This script monitors environment and adjusts conditions

spawn growth_monitor {
  -- Continuously read sensors
  sense temperature -> temp
  sense humidity -> humid
  sense co2 -> co2_level
  
  -- Check if conditions are optimal
  branch (temp < 20) {
    fruit heater.on()
  }
  
  branch (temp > 25) {
    fruit heater.off()
    fruit fan.on()
  }
  
  branch (humid < 80) {
    fruit humidifier.on()
  }
  
  -- Emit telemetry to MINDEX
  emit "mycorrhizae://telemetry" {
    temperature: temp,
    humidity: humid,
    co2: co2_level
  }
}

enzyme calculate_vpd(temp, humid) {
  -- Vapor Pressure Deficit calculation
  colonize svp -> 610.7 * 10 ^ (7.5 * temp / (237.3 + temp))
  colonize avp -> svp * (humid / 100)
  colonize vpd -> svp - avp
}
`;
