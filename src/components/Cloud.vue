<script setup>
import { NButton } from 'naive-ui'
import axios from 'axios'
import Indexed from '@/utils/indexed'


const db = new Indexed()
const props = defineProps({
    project: Number,
})

const handleUpload = () => {
    db.findOne('project', props.project).then(res => {
        if (res) {
            res.identity = res._id
            axios.post('http://test.ahriknow.cn/api/v1/post/back/project/', res, {
                headers: {
                    Authorization: localStorage.getItem('token')
                }
            }).then(res => {
                console.log(res.data)
            }).catch(err => {
                console.log(err)
            })
        }
    })
    db.findMany('api', { project: props.project }).then(res => {
        console.log(res)
    })
}
</script>

<template>
    <NButton @click="handleUpload">上传</NButton>
</template>

<style scoped>
</style>
