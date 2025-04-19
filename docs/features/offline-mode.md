# Offline Mode

This document provides detailed information about the offline mode functionality in Supplier Reminder Pro.

## Overview

Offline mode allows users to continue working with Supplier Reminder Pro even when an internet connection is unavailable. This functionality ensures business continuity during network outages, while traveling, or in environments with limited connectivity.

## Key Features

### Offline Availability

The following features remain fully functional without internet connectivity:

- **Data Viewing**: Access to all previously loaded supplier and order data
- **Data Entry**: Ability to create and edit suppliers and orders
- **Search and Filter**: Full search capabilities across local data
- **Report Generation**: Generate reports from locally available data
- **Data Export**: Export data to various file formats

### Synchronization

When connectivity is restored, the application automatically:

- **Uploads Changes**: Synchronizes local changes to the server (if applicable)
- **Downloads Updates**: Retrieves any changes made elsewhere
- **Resolves Conflicts**: Intelligently handles synchronization conflicts

### Connection Monitoring

The application actively monitors network connectivity:

- **Connection Detection**: Automatically detects when connectivity is lost or restored
- **Status Indicators**: Clear visual indicators of current connection status
- **Manual Controls**: Options to manually switch between online and offline modes
- **Smart Retries**: Automatic retry mechanisms for interrupted operations

## Implementation Details

### Local Data Storage

Offline functionality is supported through:

- **SQLite Database**: Local SQLite database for data persistence
- **IndexedDB Cache**: Browser's IndexedDB for UI-specific data caching
- **Local Storage**: Application settings stored in local storage

### State Management

The application maintains consistent state through:

- **Change Tracking**: Records of all changes made while offline
- **Transaction Logging**: Sequential logging of operations for replay
- **Conflict Resolution**: Strategies for resolving conflicting changes
- **Data Versioning**: Version tracking to identify and merge changes

### Network Detection

```typescript
// Example of network detection implementation
export class ConnectivityService {
  private onlineStatus: boolean = navigator.onLine;
  private statusListeners: ((status: boolean) => void)[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener("online", this.handleConnectionChange.bind(this));
    window.addEventListener("offline", this.handleConnectionChange.bind(this));

    // Initial check with active ping
    this.checkConnectivity();
  }

  private handleConnectionChange() {
    const newStatus = navigator.onLine;
    if (this.onlineStatus !== newStatus) {
      this.onlineStatus = newStatus;
      this.notifyListeners();

      // Additional verification if browser reports online
      if (newStatus) {
        this.checkConnectivity();
      }
    }
  }

  private async checkConnectivity() {
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch("/api/ping", {
        method: "HEAD",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      const actuallyOnline = response.ok;

      if (this.onlineStatus !== actuallyOnline) {
        this.onlineStatus = actuallyOnline;
        this.notifyListeners();
      }
    } catch (error) {
      // Error means we're offline despite browser possibly reporting online
      if (this.onlineStatus) {
        this.onlineStatus = false;
        this.notifyListeners();
      }
    }
  }

  private notifyListeners() {
    for (const listener of this.statusListeners) {
      listener(this.onlineStatus);
    }
  }

  public addStatusListener(listener: (status: boolean) => void) {
    this.statusListeners.push(listener);
    // Immediately notify with current status
    listener(this.onlineStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public isOnline(): boolean {
    return this.onlineStatus;
  }
}
```

### Synchronization Logic

```typescript
// Example of synchronization logic
export class SyncService {
  private changeLog: ChangeRecord[] = [];
  private isSyncing: boolean = false;

  // Record a change for later synchronization
  public recordChange(
    entity: string,
    action: "create" | "update" | "delete",
    data: any
  ) {
    this.changeLog.push({
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      entity,
      action,
      data,
      synced: false,
    });

    // Store change log to persistent storage
    localStorage.setItem("changeLog", JSON.stringify(this.changeLog));
  }

  // Synchronize changes when online
  public async synchronize() {
    if (this.isSyncing || !connectivityService.isOnline()) {
      return;
    }

    try {
      this.isSyncing = true;

      // Get unsynced changes
      const pendingChanges = this.changeLog.filter((change) => !change.synced);

      if (pendingChanges.length === 0) {
        return;
      }

      // Group changes by entity type for batch processing
      const changesByEntity = this.groupChangesByEntity(pendingChanges);

      // Process each entity type
      for (const [entity, changes] of Object.entries(changesByEntity)) {
        await this.syncEntityChanges(entity, changes);
      }

      // Update change log to mark synced items
      this.changeLog = this.changeLog.map((change) => {
        if (pendingChanges.some((pc) => pc.id === change.id)) {
          return { ...change, synced: true };
        }
        return change;
      });

      // Update stored change log
      localStorage.setItem("changeLog", JSON.stringify(this.changeLog));
    } catch (error) {
      console.error("Synchronization failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private groupChangesByEntity(changes: ChangeRecord[]) {
    return changes.reduce((groups, change) => {
      const { entity } = change;
      if (!groups[entity]) {
        groups[entity] = [];
      }
      groups[entity].push(change);
      return groups;
    }, {} as Record<string, ChangeRecord[]>);
  }

  private async syncEntityChanges(entity: string, changes: ChangeRecord[]) {
    // Implementation depends on the specific entity type
    switch (entity) {
      case "supplier":
        return this.syncSupplierChanges(changes);
      case "order":
        return this.syncOrderChanges(changes);
      // Other entity types...
      default:
        console.warn(`Unknown entity type for sync: ${entity}`);
    }
  }

  // Entity-specific sync implementations
  private async syncSupplierChanges(changes: ChangeRecord[]) {
    // Implementation for supplier sync
  }

  private async syncOrderChanges(changes: ChangeRecord[]) {
    // Implementation for order sync
  }
}

interface ChangeRecord {
  id: string;
  timestamp: string;
  entity: string;
  action: "create" | "update" | "delete";
  data: any;
  synced: boolean;
}
```

## User Interface

### Connectivity Indicators

The application provides clear visual indicators of connection status:

- **Status Icon**: Icon in the status bar showing current connection state
- **Color Coding**: Green for online, orange for synchronizing, red for offline
- **Tooltips**: Hover information showing detailed connectivity status
- **Notification**: Transient notification when connection status changes

### Offline Mode Indicator

```jsx
// React component for connectivity status indicator
const ConnectivityIndicator = () => {
  const [isOnline, setIsOnline] = useState(connectivityService.isOnline());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = connectivityService.addStatusListener((status) => {
      setIsOnline(status);

      // If we just came online, trigger sync
      if (status) {
        setIsSyncing(true);
        syncService.synchronize().finally(() => setIsSyncing(false));
      }
    });

    return unsubscribe;
  }, []);

  // Determine status text and icon
  const getStatusDetails = () => {
    if (isSyncing) {
      return {
        text: "Syncing...",
        icon: <SyncIcon className="animate-spin" />,
        color: "bg-yellow-500",
      };
    } else if (isOnline) {
      return {
        text: "Online",
        icon: <OnlineIcon />,
        color: "bg-green-500",
      };
    } else {
      return {
        text: "Offline",
        icon: <OfflineIcon />,
        color: "bg-red-500",
      };
    }
  };

  const { text, icon, color } = getStatusDetails();

  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
      <span className="mr-1">{text}</span>
      {icon}
    </div>
  );
};
```

## Limitations in Offline Mode

While most functionality remains available, certain features have limitations when offline:

- **External APIs**: Features requiring external services are unavailable
- **Email Sending**: Emails are queued but not sent until connectivity is restored
- **Updates**: Application updates cannot be downloaded or installed
- **External Data**: New data from external sources cannot be imported

## Best Practices

### For Users

1. **Regular Synchronization**: Connect regularly to ensure data is synchronized
2. **Monitor Status**: Pay attention to the connectivity indicator
3. **Manual Sync**: Use manual sync option before disconnecting if critical changes were made
4. **Conflict Awareness**: Be aware that conflicts may occur if the same data is modified in multiple places
5. **Export Critical Data**: For critical work, consider exporting data before extended offline periods

### For Developers

1. **Optimistic UI**: Implement optimistic UI updates for offline operations
2. **Error Handling**: Provide clear error messages for operations that cannot be completed offline
3. **Change Tracking**: Implement robust change tracking for offline modifications
4. **Conflict Resolution**: Develop clear conflict resolution strategies
5. **Testing**: Thoroughly test application behavior in various connectivity scenarios

## Troubleshooting

Common issues and their solutions:

1. **Sync Failures**: Check error logs and retry manual synchronization
2. **Stale Data**: Force refresh when online to ensure latest data
3. **Conflict Resolution**: Review and manually resolve data conflicts
4. **Storage Limits**: Clear local storage if approaching browser limits
5. **Detection Issues**: Toggle WiFi/network to force connectivity detection if status seems incorrect

## Related Features

- [Database Storage](database-storage.md) - Local storage mechanism for offline data
- [Data Export](data-export.md) - Exporting data for offline backup
- [Backup and Restore](backup-restore.md) - Creating offline backups of application data
