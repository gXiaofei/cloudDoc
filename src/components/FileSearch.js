import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import useKeyPress from '../hooks/useKeyPress';
import useIpcRenderer from '../hooks/useIpcRenderer';
// 文件搜索
const FileSearch = ({ title, onFileSearch }) => {
    const [inputActive, setinputActive] = useState(false);
    const [value, setValue] = useState('');
    const enterPressed = useKeyPress(13);
    const escPressed = useKeyPress(27);
    const closeSearch = () => {
        setinputActive(false);
        setValue('');
        onFileSearch('');
    };

    useEffect(() => {
        // 回车键
        if (enterPressed && inputActive) {
            onFileSearch(value);
        }

        // ESC键
        if (escPressed && inputActive) {
            closeSearch();
        }

        // 利用自定义hooks重写下面的代码

        // const handleInputEvent = event => {
        //     const { keyCode } = event;
        //     if (keyCode === 13 && inputActive) {
        //         // 回车键
        //         onFileSearch(value);
        //     } else if (keyCode === 27 && inputActive) {
        //         // ESC键
        //         closeSearch(event);
        //     }
        // };

        // // 添加按键事件
        // document.addEventListener('keyup', handleInputEvent);

        // return () => {
        //     // 有事件的添加记得需要remove
        //     document.removeEventListener('keyup', handleInputEvent);
        // };
    }, [enterPressed, escPressed]);

    useIpcRenderer({
        'search-file': setinputActive
    })

    return (
        <div className='alert alert-primary d-flex justify-content-between align-items-center mb-0'>
            {inputActive ? (
                <input
                    autoFocus
                    value={value}
                    className='form-control'
                    onChange={e => {
                        setValue(e.target.value);
                    }}
                    style={{
                        height: '26px'
                    }}
                />
            ) : (
                <span>{title}</span>
            )}
            <button
                type='button'
                className='icon-button'
                onClick={e => {
                    setinputActive(!inputActive);
                    if (inputActive) {
                        closeSearch(e);
                    }
                }}
            >
                {inputActive ? (
                    <FontAwesomeIcon size='lg' title='关闭' icon={faTimes} />
                ) : (
                    <FontAwesomeIcon size='lg' title='搜索' icon={faSearch} />
                )}
            </button>
        </div>
    );
};

FileSearch.propTypes = {
    title: PropTypes.string,
    onFileSearch: PropTypes.func.isRequired
};

FileSearch.defaultProps = {
    title: '我的云文档',
    onFileSearch: () => {}
};

export default FileSearch;
