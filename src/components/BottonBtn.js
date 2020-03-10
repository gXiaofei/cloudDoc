import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ButtonBtn = ({ text, colorClass, icon, onBtnClick }) => {
    return (
        <button
            type='button'
            onClick={onBtnClick}
            className={`btn btn-block no-border ${colorClass}`}
        >
            <FontAwesomeIcon className='mr-2' size='lg' icon={icon} />
            {text}
        </button>
    );
};

ButtonBtn.propTypes = {
    text: PropTypes.string,
    colorClass: PropTypes.string,
    icon: PropTypes.object.isRequired,
    onClick: PropTypes.func,
}

ButtonBtn.defaultProps = {
    text: '新建'
}

export default ButtonBtn;
