package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "workspace_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"workspace_id", "username"}))
@Getter @Setter @NoArgsConstructor
public class WorkspaceMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String addedBy;

    @Column(updatable = false, nullable = false)
    private Instant createdAt = Instant.now();

    public WorkspaceMember(String workspaceId, String username, String addedBy) {
        this.workspaceId = workspaceId;
        this.username = username;
        this.addedBy = addedBy;
    }
}
