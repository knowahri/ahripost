<script setup>
import { ref } from 'vue'
import { useMessage, NButton, NModal } from 'naive-ui'
const { ipcRenderer } = require("electron")

import lang from '@/lang/lang'
const language = ref(lang())
ipcRenderer.on("ipc-event-update", (_, context) => {
    language.value = lang(context.data)
});

const message = useMessage()
const loading = ref(false)
const showModal1 = ref(false)
const showModal2 = ref(false)
const msg = ref('false')

ipcRenderer.on("update", (_, arg) => {
    loading.value = false
    console.log(arg)
    switch (arg.code) {
        case 1:
            showModal1.value = true
            break;
        case 2:
            message.info('当前已是最新版本！')
            break
        case 3:
            message.info('正在下载！')
            break
        case 4:
            showModal2.value = true
            break
        case 5:
            message.error('更新失败。')
            break
    }
});
const handleUpdate = () => {
    loading.value = true
    ipcRenderer.send("update", 0);
}
const handleSubmit1 = () => {
    ipcRenderer.send("update", 1);
}
const handleSubmit2 = () => {
    ipcRenderer.send("update", 2);
}
</script>

<template>
    <NModal
        v-model:show="showModal1"
        :mask-closable="false"
        preset="dialog"
        title="检查更新"
        positive-text="下载更新"
        @positive-click="handleSubmit1"
        @negative-click="showModal1 = false"
        negative-text="取消"
    >有新版本，是否下载更新?</NModal>
    <NModal
        v-model:show="showModal2"
        :mask-closable="false"
        preset="dialog"
        title="检查更新"
        positive-text="安装更新"
        @positive-click="handleSubmit2"
        @negative-click="showModal2 = false"
        negative-text="取消"
    >下载完成，现在进行安装?</NModal>
    <NButton @click="handleUpdate" :loading="loading" disabled="">{{ language.update }}</NButton>
</template>

<style scoped>
</style>
