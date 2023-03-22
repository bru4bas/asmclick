<script>
   import { createEventDispatcher, beforeUpdate } from 'svelte';
   export let valor = 0;
   export let size = 2;
   let domobject;
   let focus = false;
   const dispatch = createEventDispatcher();
   
   beforeUpdate(() => {
      if(typeof domobject === 'undefined') return;
      if(focus) return;
      let txt = parseInt(valor).toString(16).toUpperCase();
      if(txt == 'NAN') return;
      while(txt.length < size) txt = '0' + txt;
      domobject.textContent = txt;
   });

   /*
    * keydown: verifica teclas válidas e o tamanho máximo do campo.
    */
   const keydown = (event) => {
      let txt = domobject.textContent;
      let key = event.key;
      if("0123456789abcdefABCDEF".includes(key)) {
         if(txt.length >= size) event.preventDefault();
         return;
      }
      if(key == 'Backspace') return;
      if(key == 'Del') return;
      if(key == 'Tab') return;
      if(key == 'ArrowRight') return;
      if(key == 'ArrowLeft') return;
      event.preventDefault();
   }

   /*
    * keyup: atualiza o valor e envia evento "change"
    */
   const keyup = (event) => {
      let txt = domobject.textContent;
      valor = parseInt(txt, 16);
      dispatch('change', valor);
   };

   /*
    * focusin: inicia edição do valor
    */
   const focusin = (event) => {
      focus = true;
   };

   /*
    * focusout: reformata o número
    */
   const focusout = (event) => {
      focus = false;
      let txt = parseInt(valor).toString(16).toUpperCase();
      if(txt == 'NAN') txt = '0';
      while(txt.length < size) txt = '0' + txt;
      domobject.textContent = txt;
   };
</script>

<p bind:this={domobject} 
   class="editable" 
   contenteditable="true" 
   on:keydown={keydown} 
   on:keyup={keyup} 
   on:focusin={focusin}
   on:focusout={focusout}>
   0
</p>

<style>
   p.editable {
      font-family: monospace;
      text-transform: uppercase;
      padding: 2px;
   }
</style>
