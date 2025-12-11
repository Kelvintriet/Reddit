import React, { useState } from 'react';
import './ShareModal.css';

interface ShareModalProps {
    url: string;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ url, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="share-modal-backdrop" onClick={handleBackdropClick}>
            <div className="share-modal">
                <div className="share-modal-header">
                    <h3>Share</h3>
                    <button className="share-modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="share-modal-content">
                    <div className="share-url-container">
                        <input
                            type="text"
                            value={url}
                            readOnly
                            className="share-url-input"
                            onClick={(e) => e.currentTarget.select()}
                        />
                    </div>

                    <button
                        className={`share-copy-button ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" />
                                </svg>
                                Copy Link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
