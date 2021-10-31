<script setup>
const handleKeyDown = e => {
    console.log(e)
}
</script>

<template>
    <div id="content" @keyup="handleKeyDown">123</div>
    <button @keyup="handleKeyDown">123</button>
</template>

<style scoped>
#content {
    width: 100px;
    height: 100px;
}
</style>
