<script>
   import { disasm } from "./arm_dis.js";
   export let valor = 0x0;

</script>

<div class="instruction">
   { disasm(valor) }
</div>

<style>
   div.instruction {
      font-size: 2em;
      text-align: center;
   }
</style>
