
const ccodes = [
   "eq",             // 0000
   "ne",             // 0001
   "cs",             // 0010
   "cc",             // 0011
   "mi",             // 0100
   "pl",             // 0101
   "vs",             // 0110
   "vc",             // 0111
   "hi",             // 1000
   "ls",             // 1001
   "ge",             // 1010
   "lt",             // 1011
   "gt",             // 1100
   "le",             // 1101
   "",               // 1110
   ""                // 1111
];

/**
 * Trata saltos (b).
 */
function trata_b(bits) {
   let offset = bits & 0x07ff;
   if((offset & 0x0400) == 0x0400) {
      offset ^= 0x07ff;
      offset = -offset-1;
   }
   let res = 'b';
   res += ` pc+#${(offset+2)*2}`
   return {
      instrucao: res,
      mask: "0000033333333333"
   };
}

/**
 * Trata saltos condicionais (b).
 */
function trata_bcond(bits) {
   let offset = bits & 0x00ff;
   if((offset & 0x0080) == 0x0080) {
      offset ^= 0x00ff;
      offset = -offset-1;
   }
   let res = 'b';
   let cond = (bits >> 8) & 0x0f;
   res += ccodes[cond];

   res += ` pc+#${(offset+2)*2}`
   return {
      instrucao: res,
      mask: "0000111133333333"
   };
}

/**
 * Trata saltos (bl).  AQUI
 */
function trata_bl(bits) {
   let offset = bits & 0x07ff;
   if((offset & 0x0400) == 0x0400) {
      offset ^= 0x07ff;
      offset = -offset-1;
   }
   let res = 'bl';
   res += ` pc+#${(offset+2)*4}`
   return {
      instrucao: res,
      mask: "0000233333333333"
   };
}

/**
 * Trata saltos (bx).
 */
function trata_bx(bits) {
   let rm = (bits >> 3) & 0x07;
   let res = 'bx';
   if((bits & 0x0040) == 0x0040) rm = rm + 8;
   res += ` r${rm}`
   return {
      instrucao: res,
      mask: "0000000002444000"
   };
}

/**
 * Trata SWI (ou SVC?)
 */
function trata_swi(bits) {
   let n = bits & 0x00ff;
   let res = "swi";
   res = res + ` #${n}`;
   return {
      instrucao: res,
      mask: "0000000033333333"
   };
}

function trata_op1(bits) {
   let rm = (bits >> 6) & 0x07;
   let rn = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let res = 'adds';
   if((bits & 0x0200) == 0x0200) res = 'subs';
   res = res + ` r${rd}, r${rn}, r${rm}`;
   return {
      instrucao: res,
      mask: "0000002444555666"
   };
}

function trata_op2(bits) {
   let imm = (bits >> 6) & 0x07;
   let rn = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let res = 'adds';
   if((bits & 0x0200) == 0x0200) res = 'subs';
   res = res + ` r${rd}, r${rn}, #${imm}`;
   return {
      instrucao: res,
      mask: "0000002333555666"
   };
}

function trata_op3(bits) {
   let imm = bits & 0x00ff;
   let rd = (bits >> 8) & 0x07;
   let op = (bits >> 11) & 0x03;
   let res = [
      'movs',
      'cmp', 
      'adds',
      'subs'
   ][op];
   res = res + ` r${rd}, #${imm}`;
   return {
      instrucao: res,
      mask: "0002244433333333"
   };
}

function trata_op4(bits) {
   let rn = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let sh = (bits >> 6) & 0x1f;
   let op = (bits >> 11) & 0x03;
   let res = [
      'lsls',
      'lsrs', 
      'asrs',
      '???'
   ][op];

   res = res + ` r${rd}, r${rn}, #${sh}`;
   return {
      instrucao: res,
      mask: "0002233333555666"
   };
}

function trata_op5(bits) {
   let rs = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let op = (bits >> 6) & 0x0f;
   let res = [
      'ands',
      'eors',
      'lsl',
      'lsr',
      'asr',
      'adds',
      'subs',
      'ror',
      'tsts',
      'negs',
      'cmps',
      'cmns',
      'orrs',
      'muls',
      'bics',
      'mvns'
   ][op];

   res = res + ` r${rd}, r${rs}`;
   return {
      instrucao: res,
      mask: "0000002222555666"
   };
}

function trata_ld1(bits) {
   let rn = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let res = 'str';
   if((bits & 0x0800) == 0x0800) res = 'ldr';
   if((bits & 0x1000) == 0x1000) res += 'b';

   let offset = (bits >> 6) & 0x001f;
   if((bits & 0x1000) == 0) offset = offset * 4; 
   res = res + ` r${rd}, [r${rn}, #${offset}]`;
   return {
      instrucao: res,
      mask: "0001233333555666"
   };
}

function trata_ld2(bits) {
   let rn = (bits >> 3) & 0x07;
   let rd = (bits & 0x07);
   let res = 'strh';
   if((bits & 0x0800) == 0x0800) res = 'ldrh';

   let offset = (bits >> 6) & 0x001f;
   offset = 2 * offset;
   res = res + ` r${rd}, [r${rn}, #${offset}]`;
   return {
      instrucao: res,
      mask: "0000233333555666"
   };
}

function trata_ld3(bits) {
   let rn = (bits >> 3) & 0x07;
   let rm = (bits >> 6) & 0x07;
   let rd = (bits & 0x07);
   let op = (bits >> 9) & 0x07;
   let res = [
      'str',
      'strh',
      'strb',
      'ldrsb',
      'ldr',
      'ldrh',
      'ldrb',
      'ldrsh'
   ][op];
   res = res + ` r${rd}, [r${rn}, r${rm}]`;
   return {
      instrucao: res,
      mask: "0000222444555666"
   };
}

function trata_ld4(bits) {
   let rd = (bits >> 8) & 0x07;
   let res = 'ldr';

   let offset = bits & 0x00ff;
   offset = 4 * offset;
   res = res + ` r${rd}, [pc, #${offset}]`;
   return {
      instrucao: res,
      mask: "0000044433333333"
   };
}

function trata_ld5(bits) {
   let rd = (bits >> 8) & 0x07;
   let res = 'str';
   if((bits & 0x0800) == 0x0800) res = 'ldr';

   let offset = bits & 0x00ff;
   offset = 4 * offset;
   res = res + ` r${rd}, [sp, #${offset}]`;
   return {
      instrucao: res,
      mask: "0000244433333333"
   };
}

/**
 * Desassembla a instrução passada como parâmetro (16 bits).
 */
export function thumb_disasm(bits) {
   if((bits & 0xff00) == 0xdf00) return trata_swi(bits);
   if((bits & 0xfc00) == 0x1800) return trata_op1(bits);
   if((bits & 0xfc00) == 0x1c00) return trata_op2(bits);
   if((bits & 0xe000) == 0x2000) return trata_op3(bits);
   if((bits & 0xe000) == 0x0000) return trata_op4(bits);
   if((bits & 0xfc00) == 0x4000) return trata_op5(bits);
   if((bits & 0xf000) == 0xd000) return trata_bcond(bits);
   if((bits & 0xf800) == 0xe000) return trata_b(bits);
   if((bits & 0xf000) == 0xf000) return trata_bl(bits);
   if((bits & 0xff87) == 0x4700) return trata_bx(bits);
   if((bits & 0xe000) == 0x6000) return trata_ld1(bits);
   if((bits & 0xf000) == 0x8000) return trata_ld2(bits);
   if((bits & 0xf000) == 0x5000) return trata_ld3(bits);
   if((bits & 0xf800) == 0x4800) return trata_ld4(bits);
   if((bits & 0xf000) == 0x9000) return trata_ld5(bits);

   return {
      instrucao: "???",
      mask: "0000000000000000"
   };
}

/*
console.log(disasm(0xe002));
console.log(disasm(0xe7fd));
console.log(disasm(0xd102));
console.log(disasm(0x4718));
console.log(disasm(0x4758));
console.log(disasm(0xdf19));
console.log(disasm(0x1888));
console.log(disasm(0x1dc8));
console.log(disasm(0x280a));
console.log(disasm(0x230a));
console.log(disasm(0x0151));
console.log(disasm(0x1151));
console.log(disasm(0x1951));
console.log(disasm(0x402b));
*/
