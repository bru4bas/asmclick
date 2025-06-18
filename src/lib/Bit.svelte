<script>
   import { createEventDispatcher } from 'svelte';
   export let valor = 0;
   export let indice = 0;
   export let bgcolor = "seashell";
   const dispatch = createEventDispatcher();
   const muda = () => {
      if(typeof valor !== 'number') valor = parseInt(valor);
      if(valor) valor = 0; else valor = 1;
      dispatch('change', { valor: valor, indice: indice });
   }
</script>

<div class="bit">
   <span class="bit">{indice}</span><br/>
   <button style="background-color: {bgcolor}" class="bit" on:dblclick={muda}>
      {valor}
   </button>
</div>

<style>
   div.bit {
      display: inline-block;
   }

   span.bit {
      font-size: 10px;
   }

   button.bit {
      color: var(--bit-button-color);
      border-radius: 0;
      padding: 10px;
      font-size: 2em;
      font-family: monospace;
      border: 1px solid black;
      cursor: default;      
   }

   @media only screen and (max-width: 1300px) {
      span.bit {
         font-size: 9px;
      }
      button.bit {
         font-size: 1.7vw;
         padding: 0.5vw;
      }
   }
   @media only screen and (max-width: 700px) {
      span.bit {
         font-size: 8px;
      }
      button.bit {
         font-size: 15px;
         padding: 0.3vw;
      }
   }
</style>
