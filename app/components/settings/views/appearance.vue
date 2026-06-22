<script lang="ts" setup>
import { generateTruckIcon } from "~/assets/utils/map/markers";
import SegmentedControl from "../segmentedControl.vue";

const { settings, activeSettings, updateProfile, DEFAULT_SETTINGS } =
    useSettings();
const { t } = useTranslations();

const truckImgSrc = ref("");
const isDriveInfoOpened = ref(false);

const isTextThemeLight = computed(
    () => activeSettings.value.textColor === "light",
);

async function updatePreviewIcon() {
    const img = await generateTruckIcon(activeSettings.value.themeColor);
    truckImgSrc.value = img.src;
}

function toggleTextColor() {
    updateProfile("textColor", isTextThemeLight.value ? "dark" : "light");
}

function toggleDriveInfoPanel() {
    isDriveInfoOpened.value = !isDriveInfoOpened.value;
}

watch(() => activeSettings.value.themeColor, updatePreviewIcon, {
    immediate: true,
});
</script>

<template>
    <div>
        <div class="small-separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:type-outline" size="24" />
                <p>{{ t("settings.textTheme") }}</p>
            </div>

            <SegmentedControl
                :left-option="t('settings.light')"
                :right-option="t('settings.dark')"
                :is-same-color="true"
                @connect="toggleTextColor"
                :active="isTextThemeLight"
                size="normal"
            />
        </div>

        <div class="small-separator"></div>

        <IncreaseOption
            :option-title="t('settings.hudButtonSize')"
            setting-name="hudBtnSize"
            :max-value="40"
            :min-value="20"
            :amount="1"
        >
            <template #icon>
                <Icon name="lucide:square-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="70">
            <HudButton v-on:click="null">
                <Icon name="lucide:star" class="icon" />
            </HudButton>
        </PreviewSetting>

        <IncreaseOption
            :option-title="t('settings.truckMarkerSize')"
            setting-name="truckMarkerSize"
            :max-value="70"
            :min-value="25"
            :amount="1"
        >
            <template #icon>
                <Icon name="lucide:map-pin-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="70">
            <div
                class="actual-truck-preview"
                :style="{
                    width: settings.truckMarkerSize + 'px',
                    height: settings.truckMarkerSize + 'px',
                    backgroundImage: `url('${truckImgSrc}')`,
                }"
            ></div>
        </PreviewSetting>

        <IncreaseOption
            :option-title="t('settings.compactTripSize')"
            setting-name="compactTripFontSize"
            :max-value="2.5"
            :min-value="1.2"
            :amount="0.1"
        >
            <template #icon>
                <Icon name="lucide:circle-plus" size="24" />
            </template>
        </IncreaseOption>

        <PreviewSetting :height="100">
            <CompactTrip
                class="compact-trip-progress preview"
                :route-distance-converted="999"
                distance-unit="mi"
                route-eta="9h 59min"
            />
        </PreviewSetting>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:circle-gauge" size="24" />
                <p>{{ t("settings.drivingInfo") }}</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDriveInfoPanel"
                    class="nav-btn settings-btn"
                >
                    {{ settings.activeUiComponents.length }} /
                    {{ DEFAULT_SETTINGS.activeUiComponents.length }}
                    {{ t("common.active") }}
                </button>
            </div>
        </div>

        <Transition name="panel-pop">
            <PopupPanel
                v-if="isDriveInfoOpened"
                :title="t('settings.selectComponents')"
                @close="toggleDriveInfoPanel"
            >
                <ManageDriveInfoPanel />
            </PopupPanel>
        </Transition>
    </div>
</template>
