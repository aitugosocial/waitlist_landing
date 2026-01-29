import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
            <div
                className={`rounded-xl shadow-2xl p-4 flex items-center gap-3 min-w-[300px] border-2 ${type === 'success'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800'
                        : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-800'
                    }`}
            >
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                >
                    <i
                        className={`${type === 'success' ? 'ri-check-line' : 'ri-close-line'
                            } text-white text-xl font-bold`}
                    ></i>
                </div>
                <p className="font-medium flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <i className="ri-close-line text-xl"></i>
                </button>
            </div>
        </div>
    );
}
