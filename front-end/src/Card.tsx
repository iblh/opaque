import React, { forwardRef } from 'react';

export const Card = forwardRef(({ entry, idx, style, ...props }, ref) => {
    const inlineStyles = {
        ...style,
    };

    let _entry = JSON.parse(entry.replace(/'/g, '"'));
    return (
        <div ref={ref} {...props} style={inlineStyles} className="card">
            <div className="card_title">{_entry.category}</div>
            <div className="card_content">
                {_entry.apps.map((app: any) => (
                    <div className="card_item" key={app.name}>
                        {app.name}
                    </div>
                ))}
            </div>
        </div>
    );
});
