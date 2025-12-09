import { useNotification } from '../contexts/NotificationContext';

const TestNotification = () => {
    const { showNotification } = useNotification();

    const testNotification = () => {
        console.log('🧪 Testing notification...');
        showNotification({
            id: 'test-notification',
            senderName: 'Test User',
            messageText: 'This is a test notification message!',
            senderId: 'test-sender-id',
            timestamp: new Date(),
            onClick: () => console.log('Test notification clicked!')
        });
    };

    return (
        <div className="fixed bottom-4 left-4 z-50">
            <button
                onClick={testNotification}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold shadow-lg"
            >
                🧪 TEST NOTIFICATION
            </button>
            <div className="mt-2 text-xs text-primary opacity-70">
                Click to test if notifications work
            </div>
        </div>
    );
};

export default TestNotification;
