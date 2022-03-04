<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NLayout, NLayoutHeader, NLayoutFooter, NSpace, NButton, NGradientText } from 'naive-ui'
import Indexed from '@/utils/indexed'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const db = new Indexed()

const handleToProject = () => {
    router.push({ name: 'project' })
}
</script>

<template>
    <n-layout style="height: 100%">
        <n-layout-header
            style="height: 64px; display: flex; align-items: center; padding: 0 24px;justify-content: space-between;"
            bordered
        >
            <NSpace>
                <n-gradient-text
                    type="info"
                    @click="handleToProject"
                    size="32"
                    style="font-weight: bold; cursor: pointer;"
                >AHRIPOST</n-gradient-text>
                <!-- <NButton @click="handleChangeTheme">{{ language.theme }}</NButton>
                <NButton v-show="project != 0" @click="handleCloseProject">{{ language.close }}</NButton>
                <NButton v-if="token" @click="handleLogout">{{ language.logout }}</NButton>
                <NButton v-else @click="handleLogin">{{ language.login }}</NButton>
                <Update />
                <Cloud :project="project" />-->
            </NSpace>
        </n-layout-header>
        <n-layout position="absolute" style="top: 64px; bottom: 32px">
            <router-view />
        </n-layout>
        <n-layout-footer
            position="absolute"
            style="height: 32px; display: flex; align-items: center; padding-left: 10px;"
            bo
        >Copyright 2022-persent ahriknow</n-layout-footer>
    </n-layout>
</template>

<style scoped>
</style>
