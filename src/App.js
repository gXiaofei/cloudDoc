import React, { useState, useEffect } from 'react';
import {
    faPlus,
    faFileImport,
    faSave
} from '@fortawesome/free-solid-svg-icons';
import SimpleMDE from 'react-simplemde-editor';
import { v4 as uuidv4 } from 'uuid';
import { flattenArr, objToArr, timestampToString } from './utils/helper';
import fileHelper from './utils/fileHelper';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'easymde/dist/easymde.min.css';
import FileSearch from './components/FileSearch';
import FileList from './components/FileList';
import ButtonBtn from './components/BottonBtn';
import TabList from './components/TabList';
import defaultFile from './utils/defaultFiles';
import useIpcRenderer from './hooks/useIpcRenderer';
import Loader from './components/Loader'
// 不加window为commonjs
const { join, basename, extname, dirname } = window.require('path');
const { remote, ipcRenderer } = window.require('electron');
const Store = window.require('electron-store');

// 实例化
const fileStore = new Store({ name: 'Files Data' });
const settingsStore = new Store({ name: 'Settings' });

const getAutoSync = () =>
    ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(
        key => !!settingsStore.get(key)
    );

const saveFilesToStore = files => {
    const filesStoreObj = objToArr(files).reduce((result, file) => {
        const { id, path, title, createdAt, isSynced, uploadedAt } = file;
        result[id] = {
            id,
            path,
            title,
            createdAt,
            isSynced,
            uploadedAt
        };
        return result;
    }, {});
    fileStore.set('files', filesStoreObj);
};

function App() {
    const [files, setFiles] = useState(fileStore.get('files') || {});
    const [activeFileID, setActiveFileIDs] = useState('');
    const [openedFileIDs, setOpenedFileIDs] = useState([]);
    const [unsaveFileIDs, setUnsaveFileIDs] = useState([]);
    const [searchFiles, setSearchFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const filesArr = objToArr(files);
    const savedLocation =
        settingsStore.get('savedFileLocation') ||
        remote.app.getPath('documents');
    const openedFiles = openedFileIDs.map(openId => {
        return files[openId];
    });
    console.log(123, files);
    const activeFile = files[activeFileID];
    const fileListArr = searchFiles.length > 0 ? searchFiles : filesArr;

    const fileClick = fileID => {
        // set current active file
        setActiveFileIDs(fileID);
        const currentFile = files[fileID];

        const { id, title, path, isLoaded } = currentFile;
        if (!isLoaded) {
            if (getAutoSync()) {
                ipcRenderer.send('download-file', {
                    key: `${title}.md`,
                    path,
                    id
                });
            } else {
                fileHelper
                    .readFile(path)
                    .then(value => {
                        const newFile = {
                            ...files[fileID],
                            body: value,
                            isLoaded: true
                        };
                        setFiles({ ...files, [fileID]: newFile });
                    })
                    .catch(err => {
                        alert(err);
                        delete files[fileID];
                        setFiles({ ...files });
                        saveFilesToStore({ ...files });
                    });
            }
        }
        // if openedFiles don't have the current ID
        // add new fileID to openedFiles
        if (!openedFileIDs.includes(fileID)) {
            setOpenedFileIDs([...openedFileIDs, fileID]);
        }
    };

    const tabClick = fileID => {
        // set current active file
        setActiveFileIDs(fileID);
    };

    const tabClose = id => {
        const newFile = {...files[id], isLoaded: false}
        const newFiles = {...files, [id]: newFile};
        setFiles(newFiles);
        saveFilesToStore(newFiles);
        // remove current id from openedFileID
        const tabsWithout = openedFileIDs.filter(fileID => fileID !== id);
        setOpenedFileIDs(tabsWithout);
        // set the active to the first opened tab if still tabs left
        if (tabsWithout.length > 0) {
            setActiveFileIDs(tabsWithout[0]);
        } else {
            setActiveFileIDs('');
        }
    };

    const fileChange = (id, value) => {
        if (value === files[id].body) {
            return;
        }

        const newFile = { ...files[id], body: value };
        setFiles({ ...files, [id]: newFile });
        // update unsaveIDs
        if (!unsaveFileIDs.includes(id)) {
            setUnsaveFileIDs([...unsaveFileIDs, id]);
        }
    };

    const deleteFile = id => {
        if (files[id].path) {
            fileHelper.deleteFile(files[id].path).then(() => {
                delete files[id];
                setFiles({ ...files });
                saveFilesToStore(files);
                // close the tab if opened
                tabClose(id);
            });
        } else {
            delete files[id];
            setFiles({ ...files });
        }
    };

    const updateFileName = (id, title, isNew) => {
        let newPath = isNew
            ? join(savedLocation, `${title}.md`)
            : join(dirname(files[id].path), `${title}.md`);

        const modifiedFile = {
            ...files[id],
            title,
            isNew: false,
            path: newPath
        };
        const newFiles = { ...files, [id]: modifiedFile };

        const repeatFileTitle = filesArr.find(file => file.title === title);

        if (repeatFileTitle) {
            alert('存在同名文件');
            return;
        }

        // 判断是不是新增的
        if (isNew) {
            fileHelper.writeFile(newPath, files[id].body).then(() => {
                setFiles(newFiles);
                saveFilesToStore(newFiles);
            });
        } else {
            const oldPaht = files[id].path;
            // 重命名
            fileHelper.renameFile(oldPaht, newPath).then(() => {
                setFiles(newFiles);
                saveFilesToStore(newFiles);
            });
        }
    };

    const fileSearch = keyword => {
        const newFiles = filesArr.filter(file => file.title.includes(keyword));
        setSearchFiles(newFiles);
    };

    const createNewFile = () => {
        const newId = uuidv4();
        const newFiles = {
            id: newId,
            title: '',
            body: '## 请输入 Markdown',
            createdAt: new Date().getTime(),
            isNew: true
        };
        setFiles({ ...files, [newId]: newFiles });
    };

    // document save
    const saveCurrentFile = () => {
        if (!activeFile) {
            return;
        }

        const { path, body, title } = activeFile;
        fileHelper
            .writeFile(
                // 在本地文件写入最新的数据
                path,
                body
            )
            .then(() => {
                // 在未保存的id中去掉该id
                setUnsaveFileIDs(
                    unsaveFileIDs.filter(id => id !== activeFile.id)
                );
                if (getAutoSync()) {
                    ipcRenderer.send('upload-file', {
                        key: `${title}.md`,
                        path
                    });
                }
            });
    };

    const importFiles = () => {
        remote.dialog
            .showOpenDialog({
                title: '选择导入的 Markdown 文件',
                message: '选择导入的 Markdown 文件',
                properties: ['openFile', 'multiSelections'],
                filters: [{ name: 'Markdown files', extensions: ['md'] }]
            })
            .then(result => {
                const paths = result.filePaths;

                const filteredPaths = paths.filter(path => {
                    const alreadyAdded = Object.values(files).find(
                        file => file.paht === path
                    );
                    return !alreadyAdded;
                });

                const importFilesArr = filteredPaths.map(path => {
                    return {
                        path,
                        id: uuidv4(),
                        title: basename(path, extname(path)),
                        createdAt: new Date().getTime()
                    };
                });

                const newFiles = { ...files, ...flattenArr(importFilesArr) };

                setFiles(newFiles);
                saveFilesToStore(newFiles);

                if (importFilesArr.length) {
                    remote.dialog.showMessageBox({
                        type: 'info',
                        title: `成功导入了${importFilesArr.length}个文件`,
                        message: `成功导入了${importFilesArr.length}个文件`
                    });
                }
            });
    };

    const activeFileUploaded = () => {
        const { id } = activeFile;
        const modifiedFile = {
            ...files[id],
            isSynced: true,
            uploadedAt: new Date().getTime()
        };
        const newFiles = { ...files, [id]: modifiedFile };
        setFiles(newFiles);
        saveFilesToStore(newFiles);
    };

    const activeFileDownloaded = (event, message) => {
        const currentFile = files[message.id];
        const {id, path} = currentFile;
        fileHelper.readFile(path).then(value => {
            let newFile;
            if(message.status === 'download-success'){
                newFile = {...files[id], body: value, isLoaded: true, isSynced: true, uploadedAt: new Date().getTime()}
            }else{
                newFile = {...files[id], body: value, isLoaded: true}
            }
            const newFiles = {...files, [id]: newFile};;
            setFiles(newFiles)
            saveFilesToStore(newFiles);
        })
    }

    const filesUploaded = () => {
        const newFiles = objToArr(files).reduce((result, file) => {
            const currentTime = new Date().getTime()
            result[file.id]  ={
                ...files[file.id],
                isSynced: true,
                uploadedAt: currentTime
            }
            return result;
        }, {})

        setFiles(newFiles)
        saveFilesToStore(newFiles)
    }

    useIpcRenderer({
        'create-new-file': createNewFile,
        'import-file': importFiles,
        'save-edit-file': saveCurrentFile,
        'active-file-uploaded': activeFileUploaded,
        'file-downloaded': activeFileDownloaded,
        'loading-status': (message, status) => {setLoading(status)},
        'files-uploaded': filesUploaded
    });

    return (
        <div className='App container-fluid px-0'>
            {loading && <Loader />}
            <div className='row no-gutters'>
                <div className='col-3 bg-light left-panel'>
                    <FileSearch title='My Document2' onFileSearch={fileSearch} />
                    <FileList
                        files={fileListArr}
                        onFileClick={fileClick}
                        onFileDelete={deleteFile}
                        onSaveEdit={updateFileName}
                    />
                    <div className='row no-gutters button-group'>
                        <div className='col'>
                            <ButtonBtn
                                text='新建'
                                colorClass='btn-primary'
                                icon={faPlus}
                                onBtnClick={createNewFile}
                            />
                        </div>
                        <div className='col'>
                            <ButtonBtn
                                text='导入'
                                colorClass='btn-success'
                                icon={faFileImport}
                                onBtnClick={importFiles}
                            />
                        </div>
                    </div>
                </div>
                <div className='col-9 right-panel'>
                    {!activeFile ? (
                        <div className='start-page'>
                            选择或者创建新的 Markdown 文档
                        </div>
                    ) : (
                        <>
                            <TabList
                                files={openedFiles}
                                activeId={activeFileID}
                                unsaveIds={unsaveFileIDs}
                                onTabClick={tabClick}
                                onCloseTab={tabClose}
                            />
                            <SimpleMDE
                                key={activeFile && activeFile.id}
                                value={activeFile && activeFile.body}
                                onChange={value => {
                                    fileChange(activeFile.id, value);
                                }}
                                options={{
                                    minHeight: '580px'
                                }}
                            />
                            {activeFile.isSynced && (
                                <span className='sync-status'>
                                    已同步，上次同步时间为
                                    {timestampToString(activeFile.uploadedAt)}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
