
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

//        33222222222211111111110000000000
//        10987654321098765432109876543210
// bits = CCCC00IOOOOSRRRRrrrriiiiiiiiiiii
// mask = 0000ffff0000ffff0000ffff0000ffff

const opcodes = [
   "and",         // 0
   "eor",         // 1
   "sub",         // 2
   "rsb",         // 3
   "add",         // 4
   "adc",         // 5
   "sbc",         // 6
   "rsc",         // 7
   "tst",         // 8
   "teq",         // 9
   "cmp",         // 10
   "cmn",         // 11
   "orr",         // 12
   "mov",         // 13
   "bic",         // 14
   "mvn",         // 15
];

const shftcodes = [
   "lsl",         // 0
   "lsr",         // 1
   "asr",         // 2
   "ror"          // 3
];

/**
 * Processa campo de operando (12 bits).
 */
function trata_operando(bits) {
   let res;
   let msk;
   if((bits & 0x02000000) == 0x02000000) {
      /*
       * Valor imediato
       */
      let val = bits & 0x000000ff;
      let n = (bits &  0x00000f00) >> 7;
      val = (val >> n) | (val << (32 - n));
      res = `#0x${val.toString(16)}`;
      msk = '333322222222';
   } else {
      /*
       * Registrador
       */
      let rm = bits & 0x0000000f;
      let shift = (bits & 0x00000ff0) >> 4;
      res = `r${rm}`;
      if((shift & 0x01) == 0x01) {
         let rs = (shift & 0xf0) >> 4;
         let st = (shift & 0x06) >> 1;
         res += `, ${shftcodes[st]} r${rs}`;
         msk = '444402236666';
      } else {
         let sa = (shift & 0xf8) >> 3;
         let st = (shift & 0x06) >> 1;
         if(sa > 0) {
            res += `, ${shftcodes[st]} #${sa}`;
         }
         msk = '222224436666';
      }
   }
   return {
      op: res,
      mask: msk
   };
}

/**
 * Trata instruções aritméticas, lógicas e de comparação.
 */
function trata_proc(bits) {
   let rn = (bits & 0x000f0000) >> 16;
   let rd = (bits & 0x0000f000) >> 12;
   let op = (bits & 0x01e00000) >> 21;
   let res = opcodes[op];
   res += trata_cond(bits);
   switch(op) {
      case 13:                   // mov
      case 15:                   // mvn
         if((bits & 0x00100000) == 0x00100000) res += 's';
         res += ` r${rd}, `;
         break;

      case 10:                   // cmp
      case 11:                   // cmn
      case 8:                    // tst
      case 9:                    // teq
         if((bits & 0x00100000) != 0x00100000) return {
            /*
             * Flag S precisa estar setado!
             */
            instrucao: '???',
            mask: "00000000000000000000000000000000"
         }
         res += ` r${rn}, `;
         break;

      default:
         if((bits & 0x00100000) == 0x00100000) res += 's';
         res += ` r${rd}, r${rn}, `;
         break;
   }

   let oper = trata_operando(bits);
   res += oper.op;
   return {
      instrucao: res,
      mask: "11110023333244445555" + oper.mask
   };
}

/**
 * Trata instruções MUL e MULA.
 */
function trata_mul(bits) {
   let rd = (bits & 0x000f0000) >> 16;
   let rn = (bits & 0x0000f000) >> 12;
   let rs = (bits & 0x00000f00) >> 8;
   let rm =  bits & 0x0000000f;
   let res;
   if((bits & 0x00200000) == 0x00200000) res = "mla";
   else res = "mul";
   res += trata_cond(bits);
   if((bits & 0x00100000) == 0x00100000) res += 's';
   if((bits & 0x00200000) == 0x00200000) {
      res += ` r${rd}, r${rm}, r${rs}, r${rn}`;
   } else {
      res += ` r${rd}, r${rm}, r${rs}`;
   }
   return {
      instrucao: res,
      mask: "11110000002344445555666600004444"
   };
}

/**
 * Trata instruções LOAD/STORE
 */
function trata_ldst(bits) {
   let rn = (bits & 0x000f0000) >> 16;
   let rd = (bits & 0x0000f000) >> 12;
   let res;
   let msk;
   let positivo = false;
   let pre = false;
   if((bits & 0x00800000) == 0x00800000) positivo = true;
   if((bits & 0x01000000) == 0x01000000) pre = true;

   if((bits & 0x00100000) == 0x00100000) res = "ldr";
   else res = "str";
   res += trata_cond(bits);
   if((bits & 0x00400000) == 0x00400000) res += 'b';
   res += ` r${rd}, [r${rn}`;
   if(!pre) res += ']';

   if((bits & 0x02000000) == 0x00000000) {
      /*
       * Valor de 12 bits imediato
       */
      let offset = bits & 0x00000fff;
      if(offset > 0) {
         if(positivo) res += `, #${offset}`;
         else res += `, -#${offset}`;
      }
      msk = "11110023232344445555222222222222";
   } else {
      /*
       * Registrador
       */
      let rm = bits & 0x0000000f;
      let shift = (bits & 0x00000ff0) >> 4;
      if(positivo) res += `, r${rm}`;
      else res += `, -r${rm}`;
      let sa = (shift & 0xf8) >> 3;
      let st = (shift & 0x06) >> 1;
      if(sa > 0) {
         res += `, ${shftcodes[st]} #${sa}`;
      }
      msk = "11110023232344445555444442206666";
   }
   if(pre) {
      res += ']';
      if((bits & 0x00200000) == 0x00200000) res += '!';
   }

   return {
      instrucao: res,
      mask: msk
   };
}

/**
 * Trata instrução MRS.
 */
function trata_mrs(bits) {
   let res = 'mrs';
   res += trata_cond(bits);
   let rd = (bits & 0x0000f000) >> 12;
   if((bits & 0x00400000) == 0x00400000) res += ` r${rd}, spsr`;
   else res += ` r${rd}, cpsr`;
   return {
      instrucao: res,
      mask: "11110000020000004444000000000000"
   };
}

/**
 * Trata instrução MSR.
 */
function trata_msr(bits) {
   let res = 'msr';
   res += trata_cond(bits);
   let rm = bits & 0x0000000f;
   if((bits & 0x00400000) == 0x00400000) res += ` spsr, r${rm}`;
   else res += ` cpsr, r${rm}`;
   return {
      instrucao: res,
      mask: "11110000020000000000000000004444"
   };
}

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

/**
 * Desassembla a instrução passada como parâmetro (16 bits).
 */
export function disasm(bits) {
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

   return {
      instrucao: "???",
      mask: "0000000000000000"
   };
}

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
