<template>
    <div id="app">
        <div class="app-container">
            <ChatHeader />
            <ErrorBanner />
            <ChatContainer />
            <AppFooter />
        </div>

        <GlobalError />
    </div>
</template>

<script setup lang="ts">
import ChatContainer from '@/components/ChatContainer.vue'
import ChatHeader from '@/components/layout/ChatHeader.vue'
import GlobalError from '@/components/layout/GlobalError.vue'
import ErrorBanner from '@/components/layout/ErrorBanner.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>
<style>
#app {
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0 !important;
    padding: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
    background-color: var(--cui-gray-50);
    max-width: none !important;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
    display: block !important;
    place-items: unset !important;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    min-height: 0;
}
</style>
