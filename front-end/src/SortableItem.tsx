import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';

export function SortableItem(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.entry });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // zIndex: isDragging ? "100" : "auto",
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        // <div
        //     ref={setNodeRef}
        //     style={style}
        //     {...attributes}
        //     {...listeners}
        //     className="card"
        // >
        //     <div className="card_title">{props.category}</div>
        //     <div className="card_content">
        //         {props.apps.map((app: any) => (
        //             <div className="card_item" key={app.name}>
        //                 {app.name}
        //             </div>
        //         ))}
        //     </div>
        // </div>
        <Card
            ref={setNodeRef}
            style={style}
            {...props}
            {...attributes}
            {...listeners}
        />
    );
}
