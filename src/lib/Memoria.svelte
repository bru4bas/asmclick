<script>
   import { createEventDispatcher } from 'svelte';
   import InputBin from "./InputBin.svelte";
   import InputHex from "./InputHex.svelte";
   export let dados = [0, 0, 0, 0];
   const dispatch = createEventDispatcher();

   const change = () => {
      dispatch('change', dados);
   };
</script>

<div class="mem">
   <p>Memória</p>
   <table class="mem">
{#each dados as d, i}
      <tr>
         <td>[pc{i==0? '': `+${i}`}]</td>
         <td><InputHex bind:valor={dados[i]} on:change={change}/>
         <td><InputBin bind:valor={dados[i]} on:change={change}/>
      </tr>
{/each}
   </table>
</div>

<style>
   div.mem p {
      margin: 0px;
      font-size: 1.6em;
      text-align: left;
   }
   div.mem {
      display: inline-block;
   }
   table.mem {
      background-color: var(--memory-bg);
      font-family: monospace;
      font-size: 1.5em;
      line-height: 1em;
      border: 1px solid black;
      border-collapse: collapse;
   }
   table.mem td {
      border: 1px solid black;
      padding: 0px 20px;
   }
</style>
