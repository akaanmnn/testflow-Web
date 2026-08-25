package com.testflow.web.service;

import com.testflow.web.entity.Workspace;
import com.testflow.web.repository.WorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaces;

    public WorkspaceService(WorkspaceRepository workspaces) {
        this.workspaces = workspaces;
    }

    /** AD grubuna karşılık gelen workspace'i getirir; yoksa oluşturur. */
    @Transactional
    public Workspace resolveByLdapGroup(String ldapGroup) {
        return workspaces.findByLdapGroup(ldapGroup)
                .orElseGet(() -> workspaces.save(new Workspace(ldapGroup, ldapGroup)));
    }
}
