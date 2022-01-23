<script setup>
import { ref, computed, onMounted } from 'vue'
import Indexed from '@/utils/indexed'
import {
    useMessage, NSpace, NButton, NInput, NIcon, NGrid, NGi, NTabs, NTabPane, NTable, NCheckbox, NInputGroup, NSelect, NDivider, NRadioGroup, NRadio
} from 'naive-ui'
import {
    CloseOutline,
} from "@vicons/ionicons5"
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// import { K } from '../../dist/assets/jsonWorker.c09b170c'
self.MonacoEnvironment = {
    getWorker(workerId, label) {
        if (label === 'json') {
            return new JsonWorker()
        }
        return new EditorWorker()
    },
}
const { ipcRenderer } = require("electron")

const db = new Indexed()
const message = useMessage()

const format = (s) => {
    if (s) {
        let date = new Date(s)
        let res = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
        return res
    }
    return ''
}

const loading = ref(false)
const tab = ref('Params')
const reqEditor = ref();
const resEditor = ref();
const api = ref({
    _id: 0,
    parent: 0,
    type: 1,
    index: 0,
    project: 0,
    name: '',
    path: '',
    method: 'GET',
    params: [],
    body: {
        type: 'json',
        data: [],
        json: {}
    },
    headers: [],
    response: {
        status: 0,
        headers: [],
        data: {}
    }
})

const response_data = computed(() => JSON.stringify(api.value.response.data, null, '\t'))

const newKey = ref('')
const newValue = ref('')
const path = computed({
    get() {
        let res = api.value.path
        let query = []
        api.value.params.forEach(param => {
            query.push(`${param.key}=${param.value}`)
        })
        if (query.length > 0) {
            res += `?${query.join('&')}`
        }
        return res
    },
    set(val) {
        api.value.path = val.split('?')[0]
    }
})

let reqInstance;
let resInstance;

const handleKeyDown = e => {
    db.update('api', api.value).then(res => {
        ipcRenderer.send("ipc-event", {
            event: 'change',
            data: null
        });
        message.success("Saved!")
    })
}

const handleSend = () => {
    api.value.date = new Date().getTime()
    loading.value = true
    let options = {
        path: path.value,
        method: api.value.method
    }
    if (['POST', 'PUT'].indexOf(api.value.method) != -1) {
        if (api.value.body.type == 'json') {
            options.data = api.value.body.json
        } else {
            options.data = {}
            api.value.body.data.forEach(d => {
                options.data[K.key] = d.value
            })
        }
    }
    if (api.value.headers.length > 0) {
        options.headers = {}
        api.value.headers.forEach(d => {
            options.headers[K.key] = d.value
        })
    }
    ipcRenderer.send("request", options);
}
ipcRenderer.on("response", (_, response) => {
    loading.value = false
    api.value.response = response
    resInstance.setValue(JSON.stringify(api.value.response.data))
    resInstance.getAction('editor.action.formatDocument').run()
})

ipcRenderer.on("ipc-event-api", (_, context) => {
    switch (context.event) {
        case 'open-api':
            {
                loading.value = true
                db.findOne('api', context.data._id).then(res => {
                    if (res) {
                        localStorage.setItem('api', context.data._id)
                        api.value = res
                        resInstance.setValue(JSON.stringify(api.value.response.data))
                        resInstance.getAction('editor.action.formatDocument').run()
                    } else {
                        api.value._id = 0
                    }
                })
                loading.value = false
            }
            break
        case 'close-api':
            if (api.value._id == context.data) {
                api.value._id = 0
            }
            break
    }
})

const handleSave = () => {

}

window.addEventListener("keydown", e => {
    if (api.value._id > 0) {
        if (e.ctrlKey && e.key == 's') {
            handleKeyDown()
            console.log("Save Api!")
        }
    }
})

const input = ref(null)

const handleInput = () => {
    if (tab.value == 'Params') {
        api.value.params.push({
            _id: new Date().getTime(),
            enable: true,
            key: newKey.value,
            value: newValue.value,
            describe: '',
            must: false
        })
    } else if (tab.value == 'Headers') {
        api.value.headers.push({
            _id: new Date().getTime(),
            enable: true,
            key: newKey.value,
            value: newValue.value,
            describe: '',
            must: false
        })
    } else if (tab.value == 'Body') {
        api.value.body.data.push({
            _id: new Date().getTime(),
            enable: true,
            key: newKey.value,
            value: newValue.value,
            describe: '',
            must: false
        })
    }
    input.value.blur()
    newKey.value = ''
    newValue.value = ''
}

const handleDelete = _id => {
    if (tab.value == 'Params') {
        api.value.params = api.value.params.filter(param => param._id != _id)
    } else if (tab.value == 'Headers') {
        api.value.headers = api.value.headers.filter(header => header._id != _id)
    } else if (tab.value == 'Body') {
        api.value.body.data = api.value.body.data.filter(data => data._id != _id)
    }
}

const handleTabChanged = arg => {
    tab.value = arg
}

const handleFormat = () => {
    resInstance.getAction('editor.action.formatDocument').run()
}

onMounted(() => {
    ipcRenderer.send("ipc-event", {
        event: 'open-api',
        data: {
            _id: parseInt(localStorage.getItem('api') || 0)
        }
    })

    let theme = 'vs'
    if (localStorage.getItem('theme') == 'dark') {
        theme = 'vs-dark'
    }
    reqInstance = monaco.editor.create(reqEditor.value, {
        language: 'json',
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        theme: theme
    })

    reqInstance.onDidChangeModelContent(() => {
        const value = reqInstance.getValue();
        api.value.body.json = JSON.parse(value)
    });

    resInstance = monaco.editor.create(resEditor.value, {
        language: 'json',
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        theme: theme
    })
})
</script>

<template>
    <NGrid v-show="!api._id" x-gap="12" :cols="1">
        <NGi>WELCOME</NGi>
    </NGrid>
    <NGrid v-show="api._id" x-gap="12" :cols="1">
        <NGi>
            <NInputGroup>
                <NSelect
                    style="width: 140px;"
                    placeholder="Method"
                    v-model:value="api.method"
                    :options="[
                        {
                            label: 'GET',
                            value: 'GET'
                        },
                        {
                            label: 'POST',
                            value: 'POST'
                        },
                        {
                            label: 'PUT',
                            value: 'PUT'
                        },
                        {
                            label: 'DELETE',
                            value: 'DELETE'
                        },
                        {
                            label: 'PATCH',
                            value: 'PATCH'
                        },
                    ]"
                ></NSelect>
                <NInput
                    @keyup.enter="handleSend"
                    @blur="handleSave"
                    v-model:value="path"
                    placeholder="Api Path"
                ></NInput>
                <NButton style="width: 100px;" :loading="loading" @click="handleSend">SEND</NButton>
            </NInputGroup>
        </NGi>
        <NGi>
            <NTabs :value="tab" size="small" @update:value="handleTabChanged">
                <NTabPane name="Params" tab="Params" display-directive="show">
                    <NTable size="small">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>键</th>
                                <th>值</th>
                                <th>描述</th>
                                <th>必须</th>
                                <th>删除</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="param in api.params" :key="param._id">
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="param.enable"></NCheckbox>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="param.key"
                                        placeholder="Key"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="param.value"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="param.describe"
                                        placeholder="Describe"
                                    ></NInput>
                                </td>
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="param.must"></NCheckbox>
                                </td>
                                <td style="text-align: center;">
                                    <NButton @click="handleDelete(param._id)" text size="small">
                                        <template #icon>
                                            <NIcon style="line-height: 32px;">
                                                <CloseOutline />
                                            </NIcon>
                                        </template>
                                    </NButton>
                                </td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>
                                    <NInput
                                        ref="input"
                                        size="small"
                                        v-model:value="newKey"
                                        @input="handleInput"
                                        placeholder="Key"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="newValue"
                                        @input="handleInput"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </NTable>
                </NTabPane>
                <NTabPane name="Body" tab="Body" display-directive="show">
                    <NRadioGroup v-model:value="api.body.type" name="radiogroup">
                        <NSpace style="padding-bottom: 10px;">
                            <NRadio value="json">Json</NRadio>
                            <NRadio value="data">Data</NRadio>
                        </NSpace>
                    </NRadioGroup>
                    <div v-show="api.body.type == 'json'" style="height: 200px;" ref="reqEditor"></div>
                    <NTable v-show="api.body.type == 'data'" size="small">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>键</th>
                                <th>值</th>
                                <th>描述</th>
                                <th>必须</th>
                                <th>删除</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="data in api.body.data" :key="data._id">
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="data.enable"></NCheckbox>
                                </td>
                                <td>
                                    <NInput size="small" v-model:value="data.key" placeholder="Key"></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="data.value"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="data.describe"
                                        placeholder="Describe"
                                    ></NInput>
                                </td>
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="data.must"></NCheckbox>
                                </td>
                                <td style="text-align: center;">
                                    <NButton @click="handleDelete(data._id)" text size="small">
                                        <template #icon>
                                            <NIcon style="line-height: 32px;">
                                                <CloseOutline />
                                            </NIcon>
                                        </template>
                                    </NButton>
                                </td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>
                                    <NInput
                                        ref="input"
                                        size="small"
                                        v-model:value="newKey"
                                        @input="handleInput"
                                        placeholder="Key"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="newValue"
                                        @input="handleInput"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </NTable>
                </NTabPane>
                <NTabPane name="Headers" tab="Headers" display-directive="show">
                    <NTable size="small">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>键</th>
                                <th>值</th>
                                <th>描述</th>
                                <th>必须</th>
                                <th>删除</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="header in api.headers" :key="header._id">
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="header.enable"></NCheckbox>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="header.key"
                                        placeholder="Key"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="header.value"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="header.describe"
                                        placeholder="Describe"
                                    ></NInput>
                                </td>
                                <td style="text-align: center;">
                                    <NCheckbox v-model:checked="header.must"></NCheckbox>
                                </td>
                                <td style="text-align: center;">
                                    <NButton @click="handleDelete(header._id)" text size="small">
                                        <template #icon>
                                            <NIcon style="line-height: 32px;">
                                                <CloseOutline />
                                            </NIcon>
                                        </template>
                                    </NButton>
                                </td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>
                                    <NInput
                                        ref="input"
                                        size="small"
                                        v-model:value="newKey"
                                        @input="handleInput"
                                        placeholder="Key"
                                    ></NInput>
                                </td>
                                <td>
                                    <NInput
                                        size="small"
                                        v-model:value="newValue"
                                        @input="handleInput"
                                        placeholder="Value"
                                    ></NInput>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </NTable>
                </NTabPane>
            </NTabs>
        </NGi>
        <NGi>
            <NDivider />
        </NGi>
        <NGi>
            <NTabs default-value="Response" size="small">
                <NTabPane name="Response" tab="Response" display-directive="show">
                    <div style="height: 300px;" ref="resEditor"></div>
                    <!-- <n-input
                        type="textarea"
                        readonly="true"
                        v-model:value="response_data"
                        placeholder="response"
                        :autosize="{
                            minRows: 3
                        }"
                    /> -->
                </NTabPane>
                <NTabPane name="Headers" tab="Headers" display-directive="show">
                    <NTable size="small">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(v, k) in api.response.headers" :key="k">
                                <td>{{ k }}</td>
                                <td>{{ v }}</td>
                            </tr>
                        </tbody>
                    </NTable>
                </NTabPane>
                <template #suffix>
                    <NButton size="small" @click="handleFormat">Format</NButton>
                    <p style="font-size: 12px; padding: 0 20px">{{ format(api.date) }}</p>
                    {{ api.response.status }}
                    {{ api.response.status > 200 ? api.response.data.detail : '' }}
                </template>
            </NTabs>
        </NGi>
    </NGrid>
</template>
