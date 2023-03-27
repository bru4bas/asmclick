<script>
   import Bitmap from './lib/Bitmap.svelte';
   import Switch from './lib/Switch.svelte';
   import { arm_disasm } from './lib/arm_dis.js';
   import { thumb_disasm } from './lib/thumb_dis.js';
   import Memoria from './lib/Memoria.svelte';

   let valores = [0, 0, 0, 0];

   function from_mem() {
      let n = valores.length;
      let i = n-1;
      let res = 0;
      while(i >= 0) {
         res = (res << 8) + valores[i];
         res = res >>> 0;
         i = i - 1;
      }
      return res;
   }

   function to_mem(v) {
      let i = 0;
      let r = 0;
      for(i=0; i<valores.length; i++) {
         valores[i] = (v >>> r) & 0xff;
         r = r + 8;
      }
   }

   //let valores = [0, 0, 0, 0];

   let instr = from_mem();

//   let  instr = /*((valores[3] << 24) +
//                 (valores[2] << 16) + */ (
//                 (valores[1] << 8) +
//                 (valores[0])) >>> 0;

    let thumb = false;
    let opcode = thumb? thumb_disasm(instr): arm_disasm(instr);

   function valores_change(event) {
      valores = event.detail;
      instr = from_mem();
//      instr = /*((valores[3] << 24) +
//               (valores[2] << 16) + */ (
//               (valores[1] << 8) +
//               (valores[0])) >>> 0;
      opcode = thumb? thumb_disasm(instr): arm_disasm(instr);
   }

   function instruction_change(event) {
      let v = event.detail >>> 0;
      console.log(`aqui v = ${v}`);
      to_mem(v);
//      valores[3] = (v >>> 24);
//      valores[2] = (v >> 16) & 0xff;
//      valores[1] = (v >> 8) & 0xff;
//      valores[0] = v & 0xff;
      instr = v;
      opcode = thumb? thumb_disasm(v): arm_disasm(v);
   }

   function modo_change() {
      if(!thumb && (valores.length == 4)) valores = [0, 0];
      else if(thumb && (valores.length == 2)) valores = [0, 0, 0, 0];
      console.log(valores);
   }

</script>

<div>

<div class="modo">
   <span class={thumb? 'normal': 'selected'}>Arm</span>
   <Switch bind:checked={thumb} on:click={modo_change}/>
   <span class={thumb? 'selected': 'normal'}>Thumb</span>
</div>
<div class="painel">
  <div>
{#if thumb}
   <Bitmap nbits=16 valor={instr} cores={opcode.mask} on:change={instruction_change}/>
{:else}
   <Bitmap nbits=32 valor={instr} cores={opcode.mask} on:change={instruction_change}/>
{/if}
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
      vertical-align: center;
   }
   .modo {
      text-align: right;
      padding-bottom: 10px;
   }
   .modo span {
      position: relative;
      top: 3px;
      padding: 2px 8px;
   }
   .selected {
      font-weight: bold;
   }
</style>
