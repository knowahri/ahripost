<script setup>
import Indexed from '@/utils/indexed'
import lang from '@/lang/lang'
import axios from 'axios'
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
    NTable,
    NSpace,
    NInputGroup,
    useMessage
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
const message = useMessage()


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
            type: -1
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
        db.create('project', {
            _id,
            name: input.value.trim(),
            describe: describe.value.trim(),
            expand: [],
            version: '0.0.0',
            date: _id
        }).then(() => {
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

const member = ref('')
const loading = ref(false)
const showMember = ref(false)
const handleMember = () => {
    showMember.value = true
}
const handleAdd = async () => {
    let res = await axios.post('http://test.ahriknow.cn/api/v1/post/back/client/member/', {
        member: member.value,
    }, {
        headers: {
            Authorization: localStorage.getItem('token')
        }
    })
    if (res.data.code == 1000000) {
        message.success("添加成功")
    } else {
        message.console.error(res.data.msg)
    }
}
</script>

<template>
    <n-layout
        position="absolute"
        style="top: 64px; bottom: 34px; padding: 24px;"
        :native-scrollbar="false"
    >
        <NButton @click="handleNewProject">新建项目</NButton>
        <br />
        <br />
        <NTable :bordered="false" :single-line="false" :single-column="false" size="small">
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
                        <NButton size="small" @click="handleMember">用户</NButton>
                        <NButton size="small">删除</NButton>
                    </td>
                </tr>
            </tbody>
        </NTable>
    </n-layout>
</template>

<style scoped>
</style>
