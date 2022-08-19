import React, { forwardRef } from 'react';

const style = {
    border: '1px solid red',
};

export const Item = forwardRef(({ id, ...props }, ref) => {
    return (
        <div {...props} style={style} ref={ref} className="dnd_card">
            {id}
        </div>
    );
});
