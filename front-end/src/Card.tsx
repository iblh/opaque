import React, { forwardRef } from 'react';
import entries from './entries2.json';

type Props = {
    cat: string;
    idx: number;
    style: any;
};
type Ref = HTMLButtonElement;

export const Card = forwardRef<Ref, Props>(
    ({ cat, idx, style, ...props }, ref) => {
        const inlineStyles = {
            ...style,
        };

        return (
            <div ref={ref} {...props} style={inlineStyles} className="card">
                <div className="card_title">{cat}</div>
                <div className="card_content">
                    {entries[cat as keyof typeof entries].map((app, idx) => (
                        <div className="card_item" key={app.name}>
                            {app.name}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);
