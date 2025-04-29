import { pool } from '../../../lib/db.js'; // Adjust path based on nesting

export default async function handler(req, res) {
    const { id: documentId } = req.params; // NEW

    if (!documentId || isNaN(parseInt(documentId))) {
        return res.status(400).json({ message: 'Invalid document ID' });
    }
    const targetDocumentId = parseInt(documentId);

    if (req.method === 'GET') {
        // --- Handle GET: Get document URL and redirect ---
        try {
            console.log(`GET /api/documents/${targetDocumentId}/download request`);

            const [documents] = await pool.execute(
                'SELECT document_path FROM documents WHERE id = ?',
                [targetDocumentId]
            );

            if (!documents || documents.length === 0) {
                return res.status(404).json({ message: 'Document record not found' });
            }

            const documentUrl = documents[0].document_path;

            if (!documentUrl) {
                return res.status(404).json({ message: 'Document file URL not found for this record' });
            }

            // Redirect the user to the Vercel Blob URL
            // This allows the browser to handle the download directly from Blob storage
            console.log(`Redirecting to Blob URL: ${documentUrl}`);
            res.writeHead(302, { Location: documentUrl });
            return res.end();

        } catch (error) {
            console.error(`Download document (${targetDocumentId}) error:`, error);
            if (error.sqlMessage) console.error('SQL Error:', error.sqlMessage);
            return res.status(500).json({ message: 'Server error processing download request' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
} 