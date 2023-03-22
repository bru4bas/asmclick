<script>
   import { createEventDispatcher, beforeUpdate } from 'svelte';
   import Bit from "./Bit.svelte";
   export let valor = 0x0;
   export let cores = '00000000000000000000000000000000';
   const dispatch = createEventDispatcher();

   const clmap = [
      'ivory',
      'azure',
      'beige',
      'lavenderblush',
      'honeydew',
      'aliceblue',
      'lightcyan'
   ];

   let bits = [];
   function change(event) {
      let detail = event.detail;
      if(typeof(valor) !== 'number') valor = parseInt(valor);
      if(detail.valor) 
         valor = (0x01 << detail.indice) | valor;
      else 
         valor = (~(0x01 << detail.indice)) & valor;
      dispatch('change', valor >>> 0);
   }

   beforeUpdate(() => {
      if(typeof(valor) !== 'number') valor = parseInt(valor);
      valor = valor >>> 0;
      bits = [];
      let bin = valor.toString(2);
      while(bin.length < 32) {
         bin = "0" + bin;
      }
      for(let i=0; i<32; i++) {
         let bgcolor = 'ivory';
         if(i < cores.length) {
            let j = parseInt(cores.charAt(i));
            if(j < clmap.length) bgcolor = clmap[j];
         }
         bits.push({
            valor: bin.charAt(i),
            indice: 31-i,
            bgcolor: bgcolor
         });
      }
   });

</script>

<div>
   {#each bits as b}
      <Bit valor={b.valor} indice={b.indice} bgcolor={b.bgcolor} on:change={change}/>
   {/each}
</div>

<style>
</style>
