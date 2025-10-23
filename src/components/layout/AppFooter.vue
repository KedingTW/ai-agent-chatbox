<template>
    <footer class="app-footer">
        <div class="copyright">
            KEDING © 2025 Keding Enterprises Co., Ltd. All rights reserved.
        </div>
    </footer>
</template>

<script setup lang="ts">
// Footer component for the application
</script>

<style scoped>
.app-footer {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--cui-primary-50);
}

.copyright {
    font-size: 0.75rem;
    color: var(--cui-gray-600);
    text-align: center;
}

/* Responsive design */
@media (max-width: 768px) {
    .copyright {
        font-size: 0.7rem;
    }
}
</style>
