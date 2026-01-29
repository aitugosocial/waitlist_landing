const API_URL = import.meta.env.VITE_API_URL || '';

export async function submitEmail(email: string) {
    try {
        const response = await fetch(`${API_URL}/api/waitlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true, message: data.message };
        } else {
            return { success: false, error: data.message || 'Failed to join waitlist' };
        }
    } catch (error) {
        console.error('Error submitting email:', error);
        return { success: false, error: 'Unable to connect to server. Please try again.' };
    }
}

export async function getWaitlistCount() {
    try {
        const response = await fetch(`${API_URL}/api/waitlist/count`);
        const data = await response.json();
        if (response.ok && data.success) {
            return { success: true, count: data.count };
        }
        return { success: false, count: 0 };
    } catch (error) {
        console.error('Error fetching waitlist count:', error);
        return { success: false, count: 0 };
    }
}
