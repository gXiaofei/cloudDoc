import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import PropTypes from 'prop-types';
import useKeyPress from '../hooks/useKeyPress';
import useContextMenu from '../hooks/useContextMenu';
import {getParentNode} from '../utils/helper';

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
    const [editStatus, setEditStatus] = useState(false);
    const [value, setValue] = useState('');
    const enterPressed = useKeyPress(13);
    const escPressed = useKeyPress(27);

    const closeSearch = editFile => {
        setEditStatus(false);
        setValue('');
        // 删除新增的
        if (editFile.isNew) {
            onFileDelete(editFile.id);
        }
    };
    const clickedItem = useContextMenu([{
        label: '打开',
        click: () => {
            const parentElement = getParentNode(clickedItem.current, 'file-item')
            if(parentElement){
                onFileClick(parentElement.dataset.id)
            }
        }
    },{
        label: '重命名',
        click: () => {
            const parentElement = getParentNode(clickedItem.current, 'file-item')
            if(parentElement){
                setValue(parentElement.dataset.title);
                setEditStatus(parentElement.dataset.id);
            }
        }
    },{
        label: '删除',
        click: () => {
            const parentElement = getParentNode(clickedItem.current, 'file-item')
            if(parentElement){
                onFileDelete(parentElement.dataset.id)
            }
        }
    }], '.file-list', [files])

    useEffect(() => {
        const editFile = files.find(file => file.id === editStatus);
        if (enterPressed && editStatus && value.trim() !== '') {
            const data = files.find(file => file.title === value);
            if (data && editFile.isNew) {
                alert('存在同名文件')
            } else {
                // 传入是否为新增的
                onSaveEdit(editStatus, value, editFile.isNew);
                setEditStatus(false);
                setValue('');
            }
        }
        if (escPressed && editStatus) {
            closeSearch(editFile);
        }
        // 利用自定义hook改写下面的代码
        // const handleInputEvent = event => {
        //     const { keyCode } = event;
        //     if (keyCode === 13 && editStatus) {
        //         onSaveEdit(editStatus, value);
        //         closeSearch(event);
        //     } else if (keyCode === 27 && editStatus) {
        //         closeSearch(event);
        //     }
        // };

        // document.addEventListener('keyup', handleInputEvent);
        // return () => {
        //     document.removeEventListener('keyup', handleInputEvent);
        // }
    });

    useEffect(() => {
        const newFile = files.find(file => file.isNew);
        if (newFile) {
            setEditStatus(newFile.id);
            setValue(newFile.title);
        }
    }, [files]);

    return (
        <ul className='list-group list-group-flush file-list'>
            {files.map(file => {
                if (file.id !== editStatus && !file.isNew) {
                    return (
                        <li
                            key={file.id}
                            className='list-group-item bg-light row d-flex align-items-center file-item mx-0'
                            data-id={file.id}
                            data-title={file.title}
                        >
                            <span className='col-2'>
                                <FontAwesomeIcon size='lg' icon={faMarkdown} />
                            </span>
                            <span
                                className='col-10 c-link'
                                onClick={() => onFileClick(file.id)}
                            >
                                {file.title}
                            </span>
                            {/* <button
                                type='button'
                                className='icon-button col-2'
                                onClick={() => {
                                    setEditStatus(file.id);
                                    setValue(file.title);
                                }}
                            >
                                <FontAwesomeIcon title='编辑' icon={faEdit} />
                            </button>

                            <button
                                type='button'
                                className='icon-button col-2'
                                onClick={() => onFileDelete(file.id)}
                            >
                                <FontAwesomeIcon title='删除' icon={faTrash} />
                            </button> */}
                        </li>
                    );
                } else {
                    return (
                        <li
                            key={file.id}
                            className='list-group-item bg-light row d-flex align-items-center file-item mx-0'
                        >
                            <input
                                placeholder='请输入文件名称'
                                autoFocus
                                value={value}
                                className='form-control col-10'
                                onChange={e => {
                                    setValue(e.target.value);
                                }}
                                style={{
                                    height: '26px'
                                }}
                            />
                            <button
                                type='button'
                                className='icon-button col-2'
                                onClick={e => {
                                    closeSearch(file);
                                }}
                            >
                                <FontAwesomeIcon
                                    size='lg'
                                    title='关闭'
                                    icon={faTimes}
                                />
                            </button>
                        </li>
                    );
                }
            })}
        </ul>
    );
};

FileList.propTypes = {
    files: PropTypes.array,
    onFileClick: PropTypes.func,
    onFileDelete: PropTypes.func,
    onSaveEdit: PropTypes.func
};

export default FileList;
