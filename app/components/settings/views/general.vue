<script lang="ts" setup>
import { ets2Expansions } from "~/data/ets2/ets2Expansions";
import { atsExpansions } from "~/data/ats/atsExpansions";

const { settings, activeSettings, updateProfile, resetSettings } =
    useSettings();
const { locale, setLocale, t } = useTranslations();

const isDlcPanelOpened = ref(false);

const isMetric = computed(() => activeSettings.value.units === "metric");
const selectedExpansion = computed(() => {
    return settings.value.selectedGame === "ets2"
        ? ets2Expansions
        : atsExpansions;
});

const languageItems = [
    { label: "English", value: "en" as LocaleCode },
    { label: "Deutsch", value: "de" as LocaleCode },
];

const currentLanguageLabel = computed(() => {
    const foundLanguage = languageItems.find((item) => {
        return item.value === locale.value;
    });

    return foundLanguage ? foundLanguage.label : "English";
});

function toggleUnits() {
    updateProfile("units", isMetric.value ? "imperial" : "metric");
}

function toggleDlcPanel() {
    isDlcPanelOpened.value = !isDlcPanelOpened.value;
}
</script>

<template>
    <div>
        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:map-plus" size="24" />
                <p>{{ t("settings.ownedDlcs") }}</p>
            </div>
            <div class="owned-dlcs">
                <button
                    @click.prevent="toggleDlcPanel"
                    class="nav-btn settings-btn"
                >
                    {{ activeSettings.ownedDlcs.length }} /
                    {{ Object.keys(selectedExpansion).length }}
                    {{ t("common.active") }}
                </button>
            </div>
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:ruler" size="24" />
                <p>{{ t("settings.units") }}</p>
            </div>

            <SegmentedControl
                :left-option="t('settings.metric')"
                :right-option="t('settings.imperial')"
                :is-same-color="true"
                @connect="toggleUnits"
                size="normal"
                :active="isMetric"
            />
        </div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:languages" size="24" />
                <p>{{ t("settings.language") }}</p>
            </div>

            <USelect
                :model-value="locale"
                @update:model-value="(val: any) => setLocale(val)"
                :items="languageItems"
                variant="none"
                class="selector"
                :ui="{
                    trailingIcon: 'shrink-0 size-[20px] text-[#1c1c1e] !px-6',
                    content: 'bg-white shadow-xl rounded-md border border-[#d1d1d6]',
                    item: 'flex items-center justify-between text-[1.6rem] font-BOLD !py-2 !px-3 text-[#1c1c1e] data-[highlighted]:bg-[#e5e5ea] rounded cursor-pointer transition-colors',
                    itemTrailingIcon: 'text-[#1c1c1e]',
                }"
            >
                <template #default>
                    <span>
                        {{ currentLanguageLabel }}
                    </span>
                </template>

                <template #item="{ item }">
                    <span>
                        {{ item.label }}
                    </span>
                </template>
            </USelect>
        </div>

        <div class="small-separator"></div>

        <div class="option setting">
            <div class="option-title">
                <Icon name="lucide:rotate-ccw" size="24" />
                <p>{{ t("settings.resetToDefaults") }}</p>
            </div>

            <button
                @click.prevent="resetSettings"
                class="nav-btn settings-btn red-color"
            >
                {{ t("common.reset") }}
            </button>
        </div>

        <Transition name="panel-pop">
            <PopupPanel
                v-if="isDlcPanelOpened"
                :title="t('common.chooseDlcs')"
                @close="toggleDlcPanel"
            >
                <ManageDlcsWindow />
            </PopupPanel>
        </Transition>
    </div>
</template>
