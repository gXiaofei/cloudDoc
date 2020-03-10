import { useState, useEffect } from 'react';

// 自定义点击
const useKeyPress = targetKeyCode => {
    const [keyPressed, setKeyPressed] = useState(false);
    const keyDownHandler = ({ keyCode }) => {
        if (keyCode === targetKeyCode) {
            setKeyPressed(true);
        } else {
            setKeyPressed(false);
        }
    };

    const keyUpHandler = ({ keyCode }) => {
        if (keyCode === targetKeyCode) {
            setKeyPressed(false);
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        return () => {
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        };
    }, []);

    return keyPressed;
};

export default useKeyPress;
