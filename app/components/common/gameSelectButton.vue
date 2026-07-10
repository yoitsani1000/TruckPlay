<script lang="ts" setup>
defineProps<{
    gameName: "ats" | "ets2";
    selectCard: (game: "ets2" | "ats" | null) => void;
    width: number;
    disabled?: boolean;
}>();

function handleClick(gameName: "ats" | "ets2", disabled: boolean | undefined, selectCard: (game: "ets2" | "ats" | null) => void) {
    if (disabled) return;
    selectCard(gameName);
}
</script>

<template>
    <div
        @click.prevent="handleClick(gameName, disabled, selectCard)"
        class="game-btn"
        :class="{ 'is-disabled': disabled }"
        :style="{ maxWidth: `${width}px` }"
    >
        <img :src="`/images/game-covers/${gameName}.webp`" alt="" />
        <div class="game-name-wrapper">
            <p class="game-name">{{ gameName }}</p>
            <slot name="icon"></slot>
        </div>
        <p v-if="disabled" class="coming-soon-badge">Coming soon</p>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/common/gameSelectButton.scss"
></style>
