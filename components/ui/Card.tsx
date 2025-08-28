
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={`bg-brand-gray-800/70 backdrop-blur-sm border border-brand-gray-700 rounded-lg shadow-lg p-6 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
