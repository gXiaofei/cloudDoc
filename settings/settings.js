const {remote, ipcRenderer} = require('electron');
const Store = require('electron-store');
const settingsStore = new Store({name: 'Settings'})
const qiniuConfigArr = ['#savedFileLocation', '#accessKey', '#secretKey', '#bucketName']

const $ = (selector) => {
    const result = document.querySelectorAll(selector);
    return result.length > 1 ? result : result[0];
}

document.addEventListener('DOMContentLoaded', () => {
    // let savedLocation = settingsStore.get('savedFileLocation')
    // if(savedLocation){
    //     $('#savedFileLocation').value = savedLocation
    // }


    qiniuConfigArr.forEach(selector => {
        const savedValue = settingsStore.get(selector.substr(1))
        if(savedValue){
            $(selector).value = savedValue
        }
    })

    $('#select-new-location').addEventListener('click', () => {
        remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            message: '选择文件的储存路径'
        }).then(res => {
            const filePath = res.filePaths[0];
            if(filePath){
                $('#savedFileLocation').value = filePath
            }
        })
    })
    $('#settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        qiniuConfigArr.forEach(selector => {
            if($(selector)){
                const {id, value} = $(selector)
                settingsStore.set(id, value)
            }
        })
        ipcRenderer.send('config-is-saved')
        remote.getCurrentWindow().close()
    })

    $('.nav-tabs').addEventListener('click', (e) => {
        e.preventDefault();
        $('.nav-link').forEach(ele => {
            ele.classList.remove('active');
        });
        e.target.classList.add('active');
        $('.config-area').forEach(ele => {
            ele.style.display = 'none';
        });
        $(e.target.dataset.tab).style.display  ='block';
    })
})