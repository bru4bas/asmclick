
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
 * Processa bits de condição, retorna o sufixo para a instrução (eq, ne, etc.).
 */
function trata_cond(bits) {
   let cc = (bits & 0xf0000000) >>> 28;
   return ccodes[cc];
}

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

function trata_rlist(bits) {
   let res = '';
   let mask = 1;
   let reg = 0;
   let marca = false;
   let last = -1;
   for(mask=1, reg=0; reg<16; mask<<=1, reg++) {
      if((bits & mask) == mask) {
         if(!marca) last = reg;
         marca = true;
      } else {
         if(marca) {
            let p = reg - 1;
            if(res.length > 0) res += ',';
            if(last != p) res += `r${last}-r${p}`;
            else res += `r${last}`;
         }
         marca = false;
      }
   }

   if(marca) {
      if(res.length > 0) res += ',';
      if(last != 15) res += `r${last}-r15`;
      else res += `r15`;
   }
   return res;
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
 * Trata saltos (B e BL).
 */
function trata_b(bits) {
   let offset = bits & 0x00ffffff;
   if((offset & 0x00800000) == 0x00800000) {
      offset ^= 0x00ffffff;
      offset = -offset-1;
   }
   let res;
   if((bits & 0x01000000) == 0x01000000) res = "bl";
   else res = "b";
   res += trata_cond(bits);
   res += ` pc+#${(offset+2)*4}`
   return {
      instrucao: res,
      mask: "11110002333333333333333333333333"
   };
}

/**
 * Trata saltos (BX).
 */
function trata_bx(bits) {
   let rn = bits & 0x0f;
   let res = 'bx';
   res += trata_cond(bits);
   res += ` r${rn}`
   return {
      instrucao: res,
      mask: "11110000000000000000000000004444"
   };
}

/**
 * Trata SWI (ou SVC?)
 */
function trata_swi(bits) {
   let n = bits & 0x00ffffff;
   let res = "swi" + trata_cond(bits);
   res = res + ` #${n}`;
   return {
      instrucao: res,
      mask: "11110000333333333333333333333333"
   };
}

/**
 * Trata instrução SWP.
 */
function trata_swp(bits) {
   let rn = (bits & 0x000f0000) >> 16;
   let rd = (bits & 0x0000f000) >> 12;
   let rm =  bits & 0x0000000f;
   let res = 'swp';
   res += trata_cond(bits);
   if((bits & 0x00400000) == 0x00400000) res += 'b';
   res += ` r${rd}, r${rm}, [r${rn}]`;
   return {
      instrucao: res,
      mask: "11110000020044445555000000004444"
   };
}

function trata_ldstm(bits) {
   let rn = (bits & 0x000f0000) >> 16;
   let res = 'stm';
   if((bits & 0x00100000) == 0x00100000) res = 'ldm';
   res += trata_cond(bits);
   let modo = 0;
   if((bits & 0x01000000) == 0x01000000) modo += 2;
   if((bits & 0x00800000) == 0x00800000) modo += 1;
   res += [
      'da',
      'ia',
      'db',
      'ib'
   ][modo];
   res += ` r${rn}`;
   if((bits & 0x00200000) == 0x00200000) res += '!';
   res = res + ', {' + trata_rlist(bits) + '}';
   if((bits & 0x00400000) == 0x00400000) res += '^';
   return {
      instrucao: res,
      mask: "11110002323244445656565656565656"
   };
}

/**
 * Desassembla a instrução passada como parâmetro (32 bits).
 */
export function arm_disasm(bits) {
   if((bits & 0x0f000000) == 0x0f000000) return trata_swi(bits);
   if((bits & 0x0ffffff0) == 0x012fff10) return trata_bx(bits);
   if((bits & 0x0fc000f0) == 0x00000090) return trata_mul(bits);
   if((bits & 0x0fb00ff0) == 0x01000090) return trata_swp(bits);
   if((bits & 0x0c000000) == 0x04000000) return trata_ldst(bits);
   if((bits & 0x0e000000) == 0x08000000) return trata_ldstm(bits);
   if((bits & 0x0e000000) == 0x0a000000) return trata_b(bits);
   if((bits & 0x0fbf0fff) == 0x010f0000) return trata_mrs(bits);
   if((bits & 0x0fbffff0) == 0x0129f000) return trata_msr(bits);
   if((bits & 0x0c000000) == 0x00000000) return trata_proc(bits);
   return {
      instrucao: "???",
      mask: "00000000000000000000000000000000"
   };
}
/*
console.log(disasm(0x10840005));
console.log(disasm(0xe3930020));
console.log(disasm(0xe0430265));
console.log(disasm(0x0f000016));
console.log(disasm(0xe0010392));
console.log(disasm(0xe0218392));
console.log(disasm(0xe3a0002c));
console.log(disasm(0xe1500001));
console.log(disasm(0x1b000000));
console.log(disasm(0x1bfffff6));
console.log(disasm(0x1b0000fe));
console.log(disasm(0xe3e00000));
console.log(disasm(0xe5830005));
console.log(disasm(0xe5983000));
console.log(disasm(0xe6983104));
console.log(disasm(0xe7b83184));
console.log(disasm(0xe14f3000));
console.log(disasm(0xe129f00a));*/
