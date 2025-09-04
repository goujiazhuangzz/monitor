<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import 'element-plus/dist/index.css';

export default {
  name: 'App'
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

#app {
  min-height: 100vh;
  background-color: #f5f7fa;
}
</style>