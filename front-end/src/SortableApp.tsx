import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableApp(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.app });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // border: isDragging ? '1px dashed red' : '1px solid transparent',
        // zIndex: isDragging ? "100" : "auto",
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <div className="card_item" key={props.app}>{props.app}</div>
        </div>
    );
}
