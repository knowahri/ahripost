<script setup>
import Indexed from '@/utils/indexed'
import lang from '@/lang/lang'
const db = new Indexed()

import { ref, onBeforeMount } from 'vue'
import {
    darkTheme,
    NConfigProvider,
    NMessageProvider,
    NLayout,
    NLayoutHeader,
    NLayoutSider,
    NLayoutFooter,
    NButton,
    NModal,
    NInput,
    NTable
} from "naive-ui"
import Cloud from "@/components/Cloud.vue"
import Update from "@/components/Update.vue"
import Catalog from "@/components/Catalog.vue"
import Api from "@/components/Api.vue"
const { ipcRenderer } = require("electron")

const project = ref(0)
const showModal = ref(false)
const input = ref('')
const describe = ref('')
const projects = ref([])
const language = ref(lang())

const handleLang = () => {
    let lang_tmp = 'zh-CN';
    if (language.value.lang == '简体中文') {
        lang_tmp = 'en-US'
    }
    language.value = lang(lang_tmp)
    ipcRenderer.send("ipc-event", {
        event: 'lang',
        data: lang_tmp
    })
}

const rightClick = e => {
    e.preventDefault()
    e.stopPropagation()
    ipcRenderer.send("ipc-event", {
        event: 'create-item',
        data: {
            _id: 0,
            type: 0
        }
    })
}

const theme = ref(null)
const token = ref('')

onBeforeMount(() => {
    token.value = localStorage.getItem('token')
    db.open().then(res => {
        // console.log(res)
    })
    db.find('project').then(res => {
        projects.value = res
    })
    project.value = parseInt(localStorage.getItem('project') || 0)
    let t = localStorage.getItem('theme')
    if (t && t == 'light') {
        localStorage.setItem('theme', 'light')
        theme.value = null
    } else {
        localStorage.setItem('theme', 'dark')
        theme.value = darkTheme
    }
})

const handleChangeTheme = () => {
    if (theme.value) {
        localStorage.setItem('theme', 'light')
        theme.value = null
    } else {
        localStorage.setItem('theme', 'dark')
        theme.value = darkTheme
    }
    window.location.reload()
}

const handleNewProject = () => {
    showModal.value = true
}

const handleCloseProject = () => {
    localStorage.setItem('project', 0)
    project.value = 0
}

const handleSubmit = () => {
    let name = input.value.trim()
    if (name.length > 0) {
        let _id = new Date().getTime()
        db.create('project', { _id, name: input.value.trim(), describe: describe.value.trim(), expand: [], version: '0.0.0' }).then(() => {
            localStorage.setItem('project', _id)
            project.value = _id
        })
    } else {
        alert('项目名不能为空')
    }
}

const handleOpenProject = proj => {
    localStorage.setItem('project', proj._id)
    project.value = proj._id
}

ipcRenderer.on("login", (_, arg) => {
    localStorage.setItem("token", arg);
    token.value = arg
});

const handleLogin = () => {
    ipcRenderer.send("login");
}

const handleLogout = () => {
    localStorage.removeItem("token");
    token.value = ''
}
</script>

<template>
    <NConfigProvider :theme="theme">
        <NMessageProvider>
            <NModal
                v-model:show="showModal"
                :mask-closable="false"
                preset="dialog"
                title="确认"
                positive-text="确认"
                @positive-click="handleSubmit"
                @negative-click="showModal = false"
                negative-text="取消"
            >
                <NInput v-model:value="input" type="text" clearable placeholder="Name" />
                <NInput v-model:value="describe" type="text" clearable placeholder="Describe" />
            </NModal>
            <n-layout style="height: 100%">
                <n-layout-header
                    style="height: 64px; display: flex; align-items: center; padding: 0 24px;justify-content: space-between;"
                    bordered
                >
                    <div>
                        <NButton @click="handleChangeTheme">{{ language.theme }}</NButton>
                        <NButton
                            v-show="project != 0"
                            @click="handleCloseProject"
                        >{{ language.close }}</NButton>
                        <NButton v-if="token" @click="handleLogout">{{ language.logout }}</NButton>
                        <NButton v-else @click="handleLogin">{{ language.login }}</NButton>
                        <Update />
                        <Cloud :project="project" />
                    </div>
                    <NButton @click="handleLang">{{ language.next }}</NButton>
                </n-layout-header>
                <n-layout
                    v-if="project == 0"
                    position="absolute"
                    style="top: 64px; bottom: 34px; padding: 24px;"
                    :native-scrollbar="false"
                >
                    <NButton @click="handleNewProject">新建项目</NButton>
                    <br />
                    <br />
                    <NTable
                        :bordered="false"
                        :single-line="false"
                        :single-column="false"
                        size="small"
                    >
                        <thead>
                            <tr>
                                <th style="width: 110px;">ID</th>
                                <th style="width: 220px;">名称</th>
                                <th>描述</th>
                                <th style="width: 220px;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="i in projects" :key="i._id">
                                <td>{{ i._id }}</td>
                                <td>{{ i.name }}</td>
                                <td>{{ i.describe }}</td>
                                <td>
                                    <NButton size="small" @click="handleOpenProject(i)">打开</NButton>
                                    <NButton size="small">删除</NButton>
                                </td>
                            </tr>
                        </tbody>
                    </NTable>
                </n-layout>
                <n-layout v-else position="absolute" style="top: 64px; bottom: 34px" has-sider>
                    <n-layout-sider
                        content-style="padding: 12px"
                        :native-scrollbar="false"
                        bordered
                        @contextmenu="rightClick"
                    >
                        <Catalog :project="project" />
                    </n-layout-sider>
                    <n-layout content-style="padding: 24px;" :native-scrollbar="false">
                        <Api></Api>
                    </n-layout>
                </n-layout>
                <n-layout-footer
                    position="absolute"
                    style="height: 34px; padding: 5px 10px; display: flex; justify-content: space-between;"
                    bordered
                >
                    <div>&copy;post.ahriknow.com</div>
                    <div>V 0.0.0</div>
                </n-layout-footer>
            </n-layout>
        </NMessageProvider>
    </NConfigProvider>
</template>

<style>
body {
    padding: 0;
    margin: 0;
    height: 100vh;
    width: 100vw;
}

#app {
    height: 100%;
    width: 100%;
}

.n-config-provider {
    height: 100%;
    width: 100%;
}

/* #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
} */
</style>
