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

const handleUpload = () => {
    loading.value = true
    db.findOne('project', props.project).then(res => {
        if (res) {
            axios.post('http://test.ahriknow.cn/api/v1/post/back/project/', res, {
                headers: {
                    Authorization: localStorage.getItem('token')
                }
            }).then(res => {
                if (res.data.code == 1000000) {
                    db.findMany('api', { key: 'project', value: props.project }).then(local_apis => {
                        let apis_json = {}
                        local_apis.forEach(item => {
                            apis_json[item._id] = item
                        });
                        res.data.data.forEach(item => {
                            if (apis_json.hasOwnProperty(item._id)) {
                                if (item.date >= apis_json[item._id]) {
                                    apis_json[item._id] = item
                                    db.update('api', item)
                                }
                            } else {
                                apis_json[item._id] = item
                                console.log(item)
                                db.create('api', item)
                            }
                        })
                        let apis = []
                        for (let k in apis_json) {
                            apis.push(apis_json[k])
                        }
                        ipcRenderer.send("ipc-event", {
                            event: 'change',
                            data: null
                        })
                        axios.post('http://test.ahriknow.cn/api/v1/post/back/api/', apis, {
                            headers: {
                                Authorization: localStorage.getItem('token')
                            }
                        }).then(res2 => {
                            console.log(res2.data)
                            loading.value = false
                        }).catch(err2 => {
                            console.log(err2)
                        })
                    })
                }
            }).catch(err => {
                console.log(err)
            })
        }
    })
}
</script>

<template>
    <NButton @click="handleUpload" :loading="loading">上传</NButton>
</template>

<style scoped>
</style>
