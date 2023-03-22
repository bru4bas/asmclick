<script>
   import Bitmap from './lib/Bitmap.svelte';
   import { disasm } from './lib/arm_dis.js';
   import Memoria from './lib/Memoria.svelte';

   let valores = [0, 0, 0, 0];
   //let instr = 0;
   //let opcode = {
   //   instrucao: "???",
   //   mask: "00000000000000000000000000000000"
   //};
   //$: {
        let  instr = ((valores[3] << 24) +
                 (valores[2] << 16) +
                 (valores[1] << 8) +
               (valores[0])) >>> 0;
         let opcode = disasm(instr);
      //}

   function valores_change(event) {
      valores = event.detail;
      instr = ((valores[3] << 24) +
               (valores[2] << 16) +
               (valores[1] << 8) +
               (valores[0])) >>> 0;
      opcode = disasm(instr);
   }

   function instruction_change(event) {
      let v = event.detail >>> 0;
      console.log(`aqui v = ${v}`);
      valores[3] = (v >>> 24);
      valores[2] = (v >> 16) & 0xff;
      valores[1] = (v >> 8) & 0xff;
      valores[0] = v & 0xff;
      instr = v;
      opcode = disasm(v);
   }
</script>

<div>

<div class="painel">
  <div>
     <Bitmap valor={instr} cores={opcode.mask} on:change={instruction_change}/>
  </div>
  
  <div class="instrucao">
     { opcode.instrucao }
   </div>
</div>

<Memoria dados={valores} on:change={valores_change}/>
</div>

<style>
   .painel {
      margin: 0;
      padding: 50px 30px;
      border-radius: 20px;
      background-color: whitesmoke;
   }
   .instrucao {
      font-size: 2em;
      text-align: center;
   }
</style>
