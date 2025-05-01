import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Set the worker source globally
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

// Utility function to get file extension
const getFileExtension = (url) => {
    if (!url) return '';
    try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        return pathname.split('.').pop()?.toLowerCase() || '';
    } catch (e) {
        // Handle invalid URLs, maybe log error or return empty
        console.error("Error parsing URL:", e);
        return '';
    }
};

// Component to display document previews with restricted functionality
const DocumentViewer = ({ fileUrl, previewPageLimit = 1 }) => { // Accept previewPageLimit prop, default to 1
    const [error, setError] = useState(null);
    const [key, setKey] = useState(0); // Key to force re-render on URL change
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef(null);

    // Re-render component when fileUrl changes
    useEffect(() => {
        setKey(prevKey => prevKey + 1);
        setError(null); // Reset error on new file load
    }, [fileUrl]);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    // Toggle fullscreen
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen();
        }
    };

    // Custom fullscreen button component
    const FullScreenButton = () => (
        <button 
            type="button" 
            onClick={toggleFullScreen}
            className="p-1 hover:bg-gray-200 rounded-sm transition-colors"
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            {isFullScreen ? (
                // Exit fullscreen icon
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path>
                </svg>
            ) : (
                // Enter fullscreen icon
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7"></path>
                </svg>
            )}
        </button>
    );

    // --- Configuration for @react-pdf-viewer ---
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        sidebarTabs: (defaultTabs) => [
            // Remove the attachments tab (if desired)
            // defaultTabs[0], // Thumbnails tab
            // defaultTabs[1], // Bookmarks tab
        ],
        // Customize the toolbar
        renderToolbar: (Toolbar) => (
            <Toolbar>
                {(slots) => {
                    const {
                        CurrentPageInput,
                        Download,        // Keep Download slot but don't render it
                        GoToNextPage,
                        GoToPreviousPage,
                        NumberOfPages,
                        Open,            // Keep Open slot but don't render it
                        Print,           // Keep Print slot but don't render it
                        ShowSearchPopover,
                        ZoomIn,
                        ZoomOut,
                    } = slots;
                    return (
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                width: '100%',
                                justifyContent: 'center', // Center toolbar items
                                padding: '4px',
                            }}
                        >
                            <div style={{ padding: '0 2px' }}>
                                <ShowSearchPopover />
                            </div>
                            <div style={{ padding: '0 2px' }}>
                                <GoToPreviousPage />
                            </div>
                            <div
                                style={{
                                    padding: '0 2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <CurrentPageInput /> / <NumberOfPages />
                            </div>
                            <div style={{ padding: '0 2px' }}>
                                <GoToNextPage />
                            </div>
                            <div style={{ padding: '0 2px', marginLeft: 'auto' }}>
                                <ZoomOut />
                            </div>
                            <div style={{ padding: '0 2px' }}>
                                <ZoomIn />
                            </div>
                            <div style={{ padding: '0 2px' }}>
                                <FullScreenButton /> {/* Use our custom FullScreenButton */}
                            </div>
                        </div>
                    );
                }}
            </Toolbar>
        ),
    });
    // --- End @react-pdf-viewer configuration ---


    // Custom rendering for PDF pages to apply blur
    const renderPage = (props) => {
        // Check if the current page index (0-based) + 1 exceeds the limit
        const isBeyondLimit = (props.pageIndex + 1) > previewPageLimit;

        return (
            <div 
                style={{ 
                    position: 'relative', 
                    width: `${props.width}px`, 
                    height: `${props.height}px`,
                }}
            >
                {/* Render the original page content with blur if beyond limit */} 
                <div style={{ 
                    filter: isBeyondLimit ? 'blur(5px) brightness(0.9)' : 'none',
                    pointerEvents: isBeyondLimit ? 'none' : 'auto',
                }}>
                    {props.canvasLayer.children}
                    <div style={{ userSelect: 'none' }}>{props.textLayer.children}</div>
                    {props.annotationLayer.children}
                </div>
                
                {/* Overlay if beyond preview limit */} 
                {isBeyondLimit && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(245, 245, 245, 0.6)', // Semi-transparent background
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '20px',
                            zIndex: 10, // Ensure it's above the page content
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                padding: '20px 30px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                maxWidth: '80%',
                            }}
                        >
                            <h3 style={{ 
                                margin: '0 0 10px 0', 
                                fontSize: '1.3rem', 
                                fontWeight: 'bold',
                                color: '#333'
                            }}>
                                Preview Limit Reached
                            </h3>
                            <p style={{ 
                                margin: '0 0 15px 0',
                                fontSize: '1rem',
                                color: '#555'
                            }}>
                                To view the complete document, please contact us.
                            </p>
                            <a 
                                href="https://wa.me/+254700000000" 
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#25D366', // WhatsApp green
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Contact via WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (error) {
        return <div className="text-red-500 p-4">Error loading document preview: {error}</div>;
    }

    if (!fileUrl) {
        return <div className="p-4 text-gray-500">No document selected or URL is invalid.</div>;
    }

    // Always render the PDF viewer as all documents are now PDFs
    return (
        <div className="w-full h-[75vh] border rounded-lg overflow-hidden" ref={containerRef}> {/* Add ref and set fixed height again */}
            <Viewer
                key={key} // Force re-render on fileUrl change
                fileUrl={fileUrl}
                plugins={[defaultLayoutPluginInstance]} // Remove fullScreenPluginInstance
                defaultScale={SpecialZoomLevel.PageWidth}
                renderPage={renderPage} // Re-enable custom renderPage
                onDocumentLoadError={(err) => {
                    console.error("PDF Viewer Load Error:", err);
                    setError(err.message || 'Failed to load PDF document.');
                }}
            />
        </div>
    );
};

export default DocumentViewer;