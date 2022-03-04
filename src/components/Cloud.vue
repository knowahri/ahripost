<script setup>
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import axios from 'axios'
import Indexed from '@/utils/indexed'
const { ipcRenderer } = require("electron");

const db = new Indexed()
const props = defineProps({
    project: Number,
})

const loading = ref(false)

const handle = () => {

}

const handleUpload = async () => {
    loading.value = true
    db.findOne('project', props.project).then(data => {
        if (data) {
            axios.post('http://test.ahriknow.cn/api/v1/post/back/client/sync/project/', data, {
                headers: {
                    Authorization: localStorage.getItem('token')
                }
            }).then(async remote_res => {
                if (remote_res.data.data.project) {
                    console.log(remote_res.data.data.project)
                }
                let local_res = await db.findMany('api', { key: 'project', value: props.project })
                let remote = {}
                let locale = {}
                remote_res.data.data.apis.forEach(item => {
                    remote[item._id] = item
                })
                local_res.forEach(item => {
                    locale[item._id] = item
                })

                let await_upload = []
                let await_download = []
                let await_sync_to_remote = []
                let await_sync_to_locale = []

                // 未在本地，待下载
                Object.keys(remote).forEach(k => {
                    if (locale.hasOwnProperty(k)) {
                        if (locale[k].date > remote[k].date) {
                            await_sync_to_remote.push(locale[k])
                        }
                    } else {
                        await_download.push(remote[k]._id)
                    }
                })
                // 未在远程，待上传
                Object.keys(locale).forEach(k => {
                    if (remote.hasOwnProperty(k)) {
                        if (remote[k].date > locale[k].date) {
                            await_sync_to_locale.push(remote[k]._id)
                        }
                    } else {
                        await_upload.push(locale[k])
                    }
                })
                
                axios.post('http://test.ahriknow.cn/api/v1/post/back/client/sync/api/', {
                    await_upload: await_upload,
                    await_download: await_download,
                    await_sync_to_remote: await_sync_to_remote,
                    await_sync_to_locale: await_sync_to_locale
                }, {
                    headers: {
                        Authorization: localStorage.getItem('token')
                    }
                }).then(res2 => {
                    res2.data.data.await_download.forEach(async a => {
                        await db.create('api', a)
                    })
                    res2.data.data.await_sync_to_locale.forEach(async a => {
                        await db.update('api', a)
                    })
                    ipcRenderer.send("ipc-event", {
                        event: 'change',
                        data: null
                    });
                    loading.value = false
                }).catch(err2 => {
                    console.log(err2)
                    loading.value = false
                })
            }).catch(err => {
                console.log(err)
                loading.value = false
            })
        }
    })
}
</script>

<template>
    <NButton @click="handleUpload" :loading="loading">同步</NButton>
</template>

<style scoped>
</style>
