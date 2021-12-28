<script setup>
import { ref, onMounted } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
    getWorker(workerId, label) {
        if (label === 'json') {
            return new JsonWorker()
        }
        return new EditorWorker()
    },
}

const editor = ref()
let instance

onMounted(() => {
    let jsonModel = monaco.editor.createModel(
        "",
        'json',
        monaco.Uri.parse('json://grid/settings.json')
    )
    instance = monaco.editor.create(editor.value, {
        model: jsonModel,
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        theme: 'vs-dark'
    })

    instance.onDidChangeModelContent(() => {
        const value = instance.getValue();
        console.log(value)
    });

    // resInstance.setValue(response)
    // resInstance.getAction('editor.action.formatDocument').run()
})
</script>

<template>
    <div style="height: 100%; width: 100%;" ref="editor"></div>
</template>
